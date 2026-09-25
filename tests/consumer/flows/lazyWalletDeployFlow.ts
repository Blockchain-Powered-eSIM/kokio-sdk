import { afterAll, beforeAll, describe, expect, it, type Mock } from "vitest";
import { erc20Abi, stringToHex, type Address, type Hex } from "viem";
import { ContractRevertError } from "kokio-sdk";
import type { KokioAdmin } from "kokio-sdk/admin";
import { ESIMWallet } from "kokio-sdk/abis";
import { Settlement, type DataBundleDetails } from "kokio-sdk/types";

import type { FlowTarget } from "./userFlow.js";
import { expectSponsored } from "../fixtures/sponsorship.js";
import { createTestUser, type TestUser } from "../fixtures/user.js";
import { testBytes32 } from "../fixtures/testLabels.js";

// Two eSIMs with more history than one copy call takes by default (25), and 18
// small ones, so the 20 wallets also need more than one deploy call (10 each).
const PURCHASES_PER_ESIM = [26, 26, ...Array.from({ length: 18 }, (_, i) => (i % 3) + 1)];
const TOTAL_PURCHASES = PURCHASES_PER_ESIM.reduce((sum, n) => sum + n, 0);
const PURCHASES_PER_RECORDING = 10;

// A user who bought every bundle by card or from an external wallet before
// installing the app, so all of it sits in the lazy wallet registry. The backend
// deploys their wallets and copies the history in when they sign up.
export const describeLazyWalletDeployFlow = (
  name: string,
  setup: () => Promise<FlowTarget>,
  passkeyGet: Mock,
  { timeout }: { timeout: number },
) => describe(name, () => {
  let target: FlowTarget;
  let admin: KokioAdmin;
  let user: TestUser;
  let eSIMIds: string[];
  // Each eSIM's purchases, in the order they were bought.
  let history: DataBundleDetails[][];
  let eSIMWallets: readonly Address[];

  beforeAll(async () => {
    target = await setup();
    admin = target.admin;
    // Only a passkey and a counterfactual address so far. Nothing is onchain.
    user = await createTestUser(target, passkeyGet);

    eSIMIds = PURCHASES_PER_ESIM.map((_, e) => `${user.uid}-e${e}`);
    history = PURCHASES_PER_ESIM.map((count, e) => Array.from({ length: count }, (_, n) => ({
      id: testBytes32(`lz${e}-${n}`),
      priceUSDCents: BigInt(100 + ((e * 7 + n * 13) % 900)),
      settlement: (e + n) % 2 === 0 ? Settlement.Fiat : Settlement.ExternalWallet,
    })));
  }, 180_000);

  afterAll(async () => {
    console.log(`lazy device wallet ${user?.deviceWallet}, ${eSIMWallets?.length ?? 0} eSIM wallets`);
    await target?.stop?.();
  });

  it(`the backend records ${TOTAL_PURCHASES} card and external wallet purchases as they come in`, async () => {
    // Round robin over the eSIMs, so one eSIM's purchases span several recordings
    // and their order has to survive across transactions.
    const arrivals: { eSIMId: string; details: DataBundleDetails }[] = [];
    for (let round = 0; round < Math.max(...PURCHASES_PER_ESIM); round++) {
      history.forEach((purchases, e) => {
        if (round < purchases.length) arrivals.push({ eSIMId: eSIMIds[e], details: purchases[round] });
      });
    }
    expect(arrivals).toHaveLength(TOTAL_PURCHASES);

    for (let start = 0; start < arrivals.length; start += PURCHASES_PER_RECORDING) {
      const chunk = arrivals.slice(start, start + PURCHASES_PER_RECORDING);
      await waitFor(await admin.lazyWalletRegistry.batchPopulateHistory(
        [user.uid], [chunk.map((a) => a.eSIMId)], [chunk.map((a) => a.details)],
      ));
    }

    expect(await admin.lazyWalletRegistry.isDeviceIdentifierReserved(user.uid)).toBe(true);
    expect(await admin.registry.isDeviceIdentifierAlreadyUsed(user.uid)).toBe(false);
    for (const [e, eSIMId] of eSIMIds.entries()) {
      // Listed in the order the device first bought each eSIM.
      expect(await admin.lazyWalletRegistry.eSIMIdentifiersAssociatedWithDeviceIdentifier(user.uid, BigInt(e))).toBe(eSIMId);
      expect(await admin.lazyWalletRegistry.outstandingHistoryEntries(eSIMId)).toBe(BigInt(PURCHASES_PER_ESIM[e]));
    }
  }, timeout);

  it("the app's passkey resolves to the address the backend will deploy", async () => {
    // The app resolved its account from the passkey, the device id and the salt the backend stores.
    const counterfactual = await admin.deviceWalletFactory.getCounterFactualAddress(user.signer.ownerKey, user.uid, user.salt);
    expect(user.deviceWallet).toBe(counterfactual);
    expect(await target.publicClient.getCode({ address: counterfactual })).toBeUndefined();
  }, timeout);

  it("the backend deploys the device wallet and all 20 eSIM wallets", async () => {
    const deployment = await admin.lazyWalletRegistry.deployLazyWalletAndSetESIMIdentifier(user.signer.ownerKey, user.uid, user.salt, 0n);
    eSIMWallets = deployment.eSIMWallets;

    expect(deployment.alreadyComplete).toBe(false);
    expect(deployment.batches.map((batch) => batch.remaining)).toEqual([10n, 0n]);
    expect(deployment.eSIMIdentifiers).toEqual(eSIMIds);
    expect(eSIMWallets).toHaveLength(eSIMIds.length);
    expect(new Set(eSIMWallets).size).toBe(eSIMWallets.length);

    const deviceWallet = user.deviceWallet;
    expect(deployment.deviceWallet).toBe(deviceWallet);
    expect(await target.publicClient.getCode({ address: deviceWallet })).toMatch(/^0x[0-9a-f]+$/i);
    expect(await admin.registry.isDeviceWalletValid(deviceWallet)).toBe(true);
    expect(await admin.registry.uniqueIdentifierToDeviceWallet(user.uid)).toBe(deviceWallet);
    expect(await admin.lazyWalletRegistry.eSIMWalletsDeployed(user.uid)).toBe(BigInt(eSIMIds.length));

    admin.setDeviceWalletAddress(deviceWallet);
    for (const [e, wallet] of eSIMWallets.entries()) {
      expect(await target.publicClient.getCode({ address: wallet })).toMatch(/^0x[0-9a-f]+$/i);
      expect(await readESIMWallet(wallet, "owner")).toBe(deviceWallet);
      expect(await readESIMWallet(wallet, "eSIMUniqueIdentifier")).toBe(eSIMIds[e]);
      expect(await admin.registry.isESIMWalletValid(wallet)).toBe(deviceWallet);
      expect(await admin.registry.eSIMWalletForIdentifier(eSIMIds[e])).toBe(wallet);
      expect(await admin.lazyWalletRegistry.lazyDeployedESIMWallet(eSIMIds[e])).toBe(wallet);
      expect(await admin.deviceWallet!.isValidESIMWallet(wallet)).toBe(true);
    }
  }, timeout);

  it("a new purchase is refused until the eSIM's history is copied in", async () => {
    const usd = stringToHex("USD", { size: 32 });
    const err = await admin.registry.recordSettledPurchase(
      eSIMWallets[0],
      { id: testBytes32("lz-early"), priceUSDCents: target.priceUSDCents, settlement: Settlement.Fiat },
      usd, target.priceUSDCents, testBytes32(`lze-${Date.now()}`),
    ).then(() => undefined, (e: unknown) => e);

    // Refused before sending, so this costs nothing.
    expect(err).toBeInstanceOf(ContractRevertError);
    expect((err as ContractRevertError).decoded?.errorName).toBe("HistoryNotFullyCopied");
  }, timeout);

  it("the backend copies every eSIM's history onto its wallet", async () => {
    for (const [e, eSIMId] of eSIMIds.entries()) {
      const copy = await admin.lazyWalletRegistry.setHistoryForLazyWallet(eSIMId);
      const count = BigInt(PURCHASES_PER_ESIM[e]);

      expect(copy.eSIMWallet).toBe(eSIMWallets[e]);
      expect(copy.copied).toBe(count);
      expect(copy.batches.map((batch) => batch.copied)).toEqual(count > 25n ? [25n, count - 25n] : [count]);
      expect(await admin.lazyWalletRegistry.historyEntriesCopied(eSIMId)).toBe(count);
      expect(await admin.lazyWalletRegistry.outstandingHistoryEntries(eSIMId)).toBe(0n);
    }
  }, timeout);

  it(`each eSIM wallet holds exactly its own purchases, in order, ${TOTAL_PURCHASES} in all`, async () => {
    for (const [e, wallet] of eSIMWallets.entries()) {
      for (const [n, expected] of history[e].entries()) {
        expect(await readHistory(wallet, BigInt(n)), `eSIM ${e} entry ${n}`).toEqual(expected);
      }
      // Nothing past the end: the contract has no length getter, so this is how to count.
      await expect(readHistory(wallet, BigInt(history[e].length))).rejects.toThrow();
    }
  }, timeout);

  it("running the deploy and the copy again sends nothing", async () => {
    const deployAgain = await admin.lazyWalletRegistry.deployLazyWalletAndSetESIMIdentifier(user.signer.ownerKey, user.uid, user.salt, 0n);
    expect(deployAgain).toMatchObject({ deviceWallet: user.deviceWallet, alreadyComplete: true, batches: [] });

    const copyAgain = await admin.lazyWalletRegistry.setHistoryForLazyWallet(eSIMIds[0]);
    expect(copyAgain).toMatchObject({ eSIMWallet: eSIMWallets[0], copied: 0n, alreadyComplete: true });
  }, timeout);

  it("the user's passkey buys a new bundle on the lazily deployed wallet", async () => {
    const asset = stringToHex("USDC", { size: 32 });
    const bundle = { id: testBytes32("lz-after"), priceUSDCents: target.priceUSDCents, settlement: Settlement.DeviceWallet };
    const ref = testBytes32(`lza-${Date.now()}`);

    user.kokio.setESIMWalletAddress(eSIMWallets[0]);
    const { token } = await user.kokio.paymentAdapter!.resolveAsset(asset);
    const quote = await user.kokio.paymentAdapter!.quote(asset, bundle.priceUSDCents);
    await target.fund(token, user.deviceWallet, quote);

    const receipt = await expectSponsored(user.client, target.publicClient,
      () => user.kokio.eSIMWallet!.buyDataBundleWithTransfer(bundle, asset, quote, ref), { confirmations: target.confirmations });

    const [event] = await target.publicClient.getContractEvents({
      address: eSIMWallets[0], abi: ESIMWallet, eventName: "DataBundleBoughtWithToken",
      args: { _paymentReference: ref }, fromBlock: receipt.receipt.blockNumber,
    });
    expect(event.args).toMatchObject({ _dataBundleID: bundle.id, _token: token, _amountSpent: quote });
    // Lands after the copied history, not in front of it.
    expect(await readHistory(eSIMWallets[0], BigInt(PURCHASES_PER_ESIM[0]))).toEqual(bundle);
    expect(await target.publicClient.readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [user.deviceWallet] })).toBe(0n);
  }, timeout);

  const waitFor = async (hash: Hex) => {
    const receipt = await target.publicClient.waitForTransactionReceipt({ hash, confirmations: target.confirmations });
    expect(receipt.status).toBe("success");
    return receipt;
  };

  const readESIMWallet = (address: Address, functionName: "owner" | "eSIMUniqueIdentifier") =>
    target.publicClient.readContract({ address, abi: ESIMWallet, functionName });

  const readHistory = async (address: Address, index: bigint): Promise<DataBundleDetails> => {
    const [id, priceUSDCents, settlement] = await target.publicClient.readContract({
      address, abi: ESIMWallet, functionName: "transactionHistory", args: [index],
    });
    return { id, priceUSDCents, settlement };
  };
});
