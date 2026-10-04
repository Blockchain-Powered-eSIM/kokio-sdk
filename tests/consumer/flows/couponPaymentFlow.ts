import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, type Mock } from "vitest";
import { pad, stringToHex, toHex, type Address, type Hex } from "viem";
import { ContractRevertError } from "kokio-sdk";
import { InvalidPaymentReferenceError, PaymentReferenceKind, type KokioAdmin } from "kokio-sdk/admin";
import { Registry } from "kokio-sdk/abis";
import { Settlement, type KokioSmartAccountClient } from "kokio-sdk/types";

import { expectSponsored } from "../fixtures/sponsorship.js";
import { createTestUser, type TestUser } from "../fixtures/user.js";
import { testBytes32 } from "../fixtures/testLabels.js";
import type { FlowTarget } from "./userFlow.js";

const E_SIM_SALT = 1n;
const USD = "USD";

// Every way the backend can be paid for one data bundle, each recorded onchain
// under a payment reference built from the order id. A coupon that covers only
// part of the price splits the order into two lines, whose references differ
// in their tag but share the order id. Tests run in order, and each one appends
// to the same eSIM wallet's history.
export const describeCouponPaymentFlow = (
  name: string,
  setup: () => Promise<FlowTarget>,
  passkeyGet: Mock,
  // `asset` is what the device wallet pays the remainder in.
  { timeout, asset }: { timeout: number; asset: string },
) => describe(name, () => {
  let target: FlowTarget;
  let admin: KokioAdmin;
  let user: TestUser;
  let eSIMWallet: Address;
  let registry: Address;

  const bundleId = testBytes32("coupon-bundle");
  let price: bigint;
  let couponCents: bigint;
  let remainderCents: bigint;
  // Next unread index in the eSIM wallet's history.
  let historyIndex = 0n;

  beforeAll(async () => {
    target = await setup();
    admin = target.admin;
    price = target.priceUSDCents;
    couponCents = (price * 3n) / 5n;
    remainderCents = price - couponCents;
    registry = (await admin.constants).factoryAddresses.REGISTRY as Address;

    // A user set up as in the user flow: device wallet deployed and registered, one eSIM wallet bound.
    user = await createTestUser(target, passkeyGet);
    await sponsored("deploy device wallet", () => user.kokio.deviceWallet!.sendUserOperation([]));
    await waitFor("register device wallet",
      await admin.deviceWalletFactory.postCreateAccount(user.deviceWallet, user.uid, user.signer.ownerKey, user.salt));
    await sponsored("bind eSIM wallet", async () => {
      const result = await user.kokio.deviceWallet!.deployAndBindESIMWallet(E_SIM_SALT, { grantAccessToFunds: false });
      eSIMWallet = result.eSIMWalletAddress;
      return result.userOpHash;
    });
    admin.setDeviceWalletAddress(user.deviceWallet).setESIMWalletAddress(eSIMWallet);
  }, 300_000);

  afterAll(async () => {
    // Recorded so a live run can be looked up on a block explorer.
    console.log(`device wallet ${user?.deviceWallet}, eSIM wallet ${eSIMWallet}`);
    await target?.stop?.();
  });

  it("an order paid in full by card keeps its reference untagged", async () => {
    const order = newOrder();
    const ref = admin.utils.tagPaymentReference(order, PaymentReferenceKind.Standard);
    expect(ref).toBe(order);

    const tokenAmount = await quote(USD, price);
    const receipt = await record("card", ref, price, Settlement.Fiat, USD, tokenAmount);

    const [event] = await settledEvents([ref], receipt.blockNumber);
    expect(event.args).toMatchObject({ _priceUSDCents: price, _settlement: Settlement.Fiat, _asset: symbol(USD), _tokenAmount: tokenAmount });
    expect(admin.utils.parsePaymentReference(event.args._paymentReference!)).toEqual({ kind: PaymentReferenceKind.Standard, reference: order });
    await expectHistory([{ priceUSDCents: price, settlement: Settlement.Fiat }]);
  }, timeout);

  it("an order paid in full by a coupon is tagged 0xfee0ff", async () => {
    const order = newOrder();
    const ref = admin.utils.tagPaymentReference(order, PaymentReferenceKind.Coupon);
    expect(ref.startsWith("0xfee0ff")).toBe(true);

    // No money moved, so nothing was paid in the recorded currency.
    const receipt = await record("coupon", ref, price, Settlement.Fiat, USD, 0n);

    const [event] = await settledEvents([ref], receipt.blockNumber);
    expect(event.args).toMatchObject({ _priceUSDCents: price, _settlement: Settlement.Fiat, _tokenAmount: 0n });
    expect(admin.utils.parsePaymentReference(event.args._paymentReference!)).toEqual({ kind: PaymentReferenceKind.Coupon, reference: order });
    await expectHistory([{ priceUSDCents: price, settlement: Settlement.Fiat }]);
  }, timeout);

  // Paid outside the protocol: the backend confirms the user's share offchain, records it,
  // then records the coupon's share.
  const recordedSplits = [
    { label: "card", settlement: Settlement.Fiat, paidIn: USD },
    { label: "an external wallet", settlement: Settlement.ExternalWallet, paidIn: "USDC" },
  ];

  recordedSplits.forEach(({ label, settlement, paidIn }) => {
    it(`an order split between a coupon and ${label} is recorded as two lines of one order`, async () => {
      const order = newOrder();
      const couponRef = admin.utils.tagPaymentReference(order, PaymentReferenceKind.CouponPart);
      const remainderRef = admin.utils.tagPaymentReference(order, PaymentReferenceKind.Remainder);
      expect(couponRef.startsWith("0xfee0ffc0de")).toBe(true);
      expect(remainderRef.startsWith("0xfee0ffba1a5ce0")).toBe(true);

      const tokenAmount = await quote(paidIn, remainderCents);
      const first = await record(`coupon + ${label}, user's share`, remainderRef, remainderCents, settlement, paidIn, tokenAmount);
      await record(`coupon + ${label}, coupon's share`, couponRef, couponCents, Settlement.Fiat, USD, 0n);

      // The order id gives both references, so one query finds both lines.
      const events = await settledEvents([couponRef, remainderRef], first.blockNumber);
      expect(events.map((e) => admin.utils.parsePaymentReference(e.args._paymentReference!))).toEqual([
        { kind: PaymentReferenceKind.Remainder, reference: order },
        { kind: PaymentReferenceKind.CouponPart, reference: order },
      ]);
      expect(events[0].args).toMatchObject({ _priceUSDCents: remainderCents, _settlement: settlement, _asset: symbol(paidIn), _tokenAmount: tokenAmount });
      expect(events[1].args).toMatchObject({ _priceUSDCents: couponCents, _settlement: Settlement.Fiat, _tokenAmount: 0n });
      expect(events[0].args._priceUSDCents! + events[1].args._priceUSDCents!).toBe(price);

      await expectHistory([
        { priceUSDCents: remainderCents, settlement },
        { priceUSDCents: couponCents, settlement: Settlement.Fiat },
      ]);
    }, timeout);
  });

  let spentCouponRef: Hex;

  it("an order split between a coupon and the device wallet: the app pays its share, then the backend records the coupon's", async () => {
    const order = newOrder();
    const couponRef = admin.utils.tagPaymentReference(order, PaymentReferenceKind.CouponPart);
    const remainderRef = admin.utils.tagPaymentReference(order, PaymentReferenceKind.Remainder);

    const { token } = await admin.paymentAdapter.resolveAsset(symbol(asset));
    const amountIn = await quote(asset, remainderCents);
    await target.fund(token, user.deviceWallet, amountIn);

    // Backend: builds the calls for the user's share only. App: signs them as given.
    const calls = await admin.calls.buyDataBundleWithTransfer(
      eSIMWallet, { id: bundleId, priceUSDCents: remainderCents, settlement: Settlement.DeviceWallet }, symbol(asset), amountIn, remainderRef);
    const receipt = await sponsored("coupon + device wallet, user's share", () => user.kokio.deviceWallet!.sendUserOperation(calls));

    // Backend: its webhook reads the reference back to the order before recording the coupon.
    const paid = await admin.utils.verifyProtocolPayment(receipt.receipt.transactionHash, asset, eSIMWallet);
    expect(paid.priceUSDCents).toBe(remainderCents);
    expect(paid.payments.map((p) => admin.utils.parsePaymentReference(p.paymentReference)))
      .toEqual([{ kind: PaymentReferenceKind.Remainder, reference: order }]);

    await record("coupon + device wallet, coupon's share", couponRef, couponCents, Settlement.Fiat, USD, 0n);
    spentCouponRef = couponRef;

    await expectHistory([
      { priceUSDCents: remainderCents, settlement: Settlement.DeviceWallet },
      { priceUSDCents: couponCents, settlement: Settlement.Fiat },
    ]);
  }, timeout);

  it("a retried write is refused, and a reference cannot be tagged twice", async () => {
    // Refused before sending, so this costs nothing even on a live chain.
    const again = await admin.registry
      .recordSettledPurchase(eSIMWallet, { id: bundleId, priceUSDCents: couponCents, settlement: Settlement.Fiat }, symbol(USD), 0n, spentCouponRef)
      .catch((e: unknown) => e);
    expect(again).toBeInstanceOf(ContractRevertError);
    expect((again as ContractRevertError).decoded?.errorName).toBe("PaymentReferenceAlreadyUsed");

    expect(() => admin.utils.tagPaymentReference(spentCouponRef, PaymentReferenceKind.Remainder)).toThrow(InvalidPaymentReferenceError);
    const unknownTag: Hex = `0xfee0ff01${"0".repeat(32)}${spentCouponRef.slice(-24)}`;
    expect(() => admin.utils.parsePaymentReference(unknownTag)).toThrow(InvalidPaymentReferenceError);
  }, timeout);

  // What the backend sends to the SDK: a 12-byte Mongo ObjectId left-padded to 32 bytes.
  const newOrder = (): Hex => pad(toHex(randomBytes(12)), { size: 32 });
  const symbol = (name: string): Hex => stringToHex(name, { size: 32 });
  const quote = (name: string, cents: bigint) => admin.paymentAdapter.quote(symbol(name), cents);

  const record = async (step: string, ref: Hex, priceUSDCents: bigint, settlement: Settlement, paidIn: string, tokenAmount: bigint) =>
    waitFor(step, await admin.registry.recordSettledPurchase(
      eSIMWallet, { id: bundleId, priceUSDCents, settlement }, symbol(paidIn), tokenAmount, ref));

  const settledEvents = (refs: Hex[], fromBlock: bigint) => target.publicClient.getContractEvents({
    address: registry, abi: Registry, eventName: "DataBundleSettled",
    args: { _eSIMWallet: eSIMWallet, _paymentReference: refs }, fromBlock,
  });

  // Reads the next entries of the eSIM wallet's history and checks them against `entries`.
  const expectHistory = async (entries: { priceUSDCents: bigint; settlement: Settlement }[]) => {
    for (const entry of entries) {
      expect(await admin.eSIMWallet!.transactionHistory(historyIndex++)).toEqual({ id: bundleId, ...entry });
    }
  };

  const link = (hash: Hex) => (target.explorerTx ? `${target.explorerTx}${hash}` : hash);
  const log = (step: string, message: string) => console.log(`[${step}] ${message}`);

  const sponsored = async (step: string, send: () => Promise<Hex>, sender: KokioSmartAccountClient = user.client) => {
    const receipt = await expectSponsored(sender, target.publicClient, send, { confirmations: target.confirmations });
    log(step, `user operation ${receipt.userOpHash}, transaction ${link(receipt.receipt.transactionHash)}`);
    return receipt;
  };

  const waitFor = async (step: string, hash: Hex) => {
    const receipt = await target.publicClient.waitForTransactionReceipt({ hash, confirmations: target.confirmations });
    log(step, `transaction ${link(hash)}`);
    expect(receipt.status).toBe("success");
    return receipt;
  };
});
