import { afterAll, beforeAll, describe, expect, it, type Mock } from "vitest";
import {
  createWalletClient, encodeAbiParameters, erc20Abi, http, keccak256, stringToHex,
  type Address, type Hex, type PublicClient,
} from "viem";
import { createBundlerClient } from "viem/account-abstraction";
import { baseSepolia } from "viem/chains";
import { ContractRevertError, Kokio } from "kokio-sdk";
import type { KokioAdmin } from "kokio-sdk/admin";
import { ESIMWallet, ESIMWalletFactory, Registry } from "kokio-sdk/abis";
import { Settlement, type KokioSmartAccountClient } from "kokio-sdk/types";

import { createSoftSigner } from "../../utils/softP256Signer.js";
import { asPasskey } from "../fixtures/passkeyAuthenticator.js";
import { expectSponsored } from "../fixtures/sponsorship.js";
import { createTestUser } from "../fixtures/user.js";
import { CREDENTIAL_ID, RP_ID, TEST_TAG, testBytes32, testDeviceId } from "../fixtures/testLabels.js";

/** Where the flow runs, and the few things that differ between a fork and Base Sepolia. */
export interface FlowTarget {
  rpcUrl: string;
  publicClient: PublicClient;
  pimlicoAPIKey: string;
  policyId: string;
  /** Left out to send user operations to Pimlico, as an app does. */
  bundlerUrl?: string;
  /** Where the backend looks up a user operation receipt. */
  receiptUrl: string;
  /** The backend, signing with its own private key as the registry's eSIM wallet admin. */
  admin: KokioAdmin;
  /** Puts `amount` of `token` in the user's device wallet. */
  fund: (token: Address, to: Address, amount: bigint) => Promise<void>;
  priceUSDCents: bigint;
  /** Blocks to wait after each write before reading its result. */
  confirmations: number;
  /** Block explorer transaction URL prefix, so logged hashes can be opened. */
  explorerTx?: string;
  stop?: () => Promise<void>;
}

const E_SIM_SALT = 1n;

// Signup to an eSIM identifier onchain, in the order an app and its backend run
// it. One test per step, and later steps build on earlier ones.
export const describeUserFlow = (
  name: string,
  setup: () => Promise<FlowTarget>,
  passkeyGet: Mock,
  // The first asset pays for steps 6 and the top-up. Each other one gets its own
  // purchase at the end, since the payment adapter accepts several.
  { timeout, assets: [primaryAsset, ...otherAssets] }: { timeout: number; assets: [string, ...string[]] },
) => describe(name, () => {
  let target: FlowTarget;
  let admin: KokioAdmin;
  let asset: Hex;
  let bundle: { id: Hex; priceUSDCents: bigint; settlement: Settlement };

  // What the backend stores against the user at signup.
  const signer = createSoftSigner(RP_ID);
  const db = {
    uid: testDeviceId(),
    salt: BigInt(Date.now()),
    ownerKey: signer.ownerKey,
    deviceWallet: undefined as unknown as Address,
    eSIMWallet: undefined as unknown as Address,
  };

  let session: Kokio;
  let client: KokioSmartAccountClient;

  beforeAll(async () => {
    target = await setup();
    admin = target.admin;
    asset = stringToHex(primaryAsset, { size: 32 });
    bundle = { id: testBytes32("flow-bundle"), priceUSDCents: target.priceUSDCents, settlement: Settlement.DeviceWallet };
    passkeyGet.mockImplementation(asPasskey(signer));
  }, 180_000);

  afterAll(async () => {
    // Recorded so a live run can be looked up on a block explorer.
    console.log(`device wallet ${db.deviceWallet}, eSIM wallet ${db.eSIMWallet}`);
    await target?.stop?.();
  });

  it("0. the backend works out the device wallet address at signup", async () => {
    db.deviceWallet = await admin.deviceWalletFactory.getCounterFactualAddress(db.ownerKey, db.uid, db.salt);
    log("0", `device wallet ${db.deviceWallet}, salt ${db.salt}, device ${db.uid}`);

    expect(await target.publicClient.getCode({ address: db.deviceWallet })).toBeUndefined();
  }, timeout);

  it("1. the app resolves the same smart account from the passkey", async () => {
    const walletClient = createWalletClient({ chain: baseSepolia, transport: http(target.rpcUrl) });
    const kokio = new Kokio(walletClient, CREDENTIAL_ID, RP_ID, target.pimlicoAPIKey, target.policyId);

    const account = await kokio.smartAccount.getSmartWallet(db.uid, db.ownerKey, db.salt);
    log("1", `app resolved ${account.address}, no transaction`);
    expect(account.address).toBe(db.deviceWallet);

    client = await kokio.smartAccount.getSmartWalletClient(account, { bundlerUrl: target.bundlerUrl });
    session = new Kokio(walletClient, CREDENTIAL_ID, RP_ID, target.pimlicoAPIKey, target.policyId, client, account.address);
  }, timeout);

  it("2. the app deploys the device wallet with a sponsored user operation", async () => {
    await sponsored("2", () => session.deviceWallet!.sendUserOperation([]));

    expect(await target.publicClient.getCode({ address: db.deviceWallet })).toMatch(/^0x[0-9a-f]+$/i);
    expect(await admin.registry.isDeviceWalletValid(db.deviceWallet)).toBe(false);
  }, timeout);

  it("3. the backend registers the device wallet from its own records", async () => {
    await waitFor("3", await admin.deviceWalletFactory.postCreateAccount(db.deviceWallet, db.uid, db.ownerKey, db.salt));

    expect(await admin.registry.isDeviceWalletValid(db.deviceWallet)).toBe(true);
  }, timeout);

  let bindUserOp: Hex;

  it("4. the app deploys and binds an eSIM wallet without granting fund access", async () => {
    await sponsored("4", async () => {
      const result = await session.deviceWallet!.deployAndBindESIMWallet(E_SIM_SALT, { grantAccessToFunds: false });
      db.eSIMWallet = result.eSIMWalletAddress;
      return (bindUserOp = result.userOpHash);
    });
    session.setESIMWalletAddress(db.eSIMWallet);
    log("4", `eSIM wallet ${db.eSIMWallet}`);

    expect(await session.deviceWallet!.canPullFunds(db.eSIMWallet)).toBe(false);
  }, timeout);

  it("5. the backend verifies the eSIM wallet belongs to this user's device wallet", async () => {
    // The app sends only { eSIMWallet, eSIMSalt, userOpHash }. The device wallet
    // comes from the backend's own records.
    const bundler = createBundlerClient({ transport: http(target.receiptUrl) });
    const receipt = await bundler.waitForUserOperationReceipt({ hash: bindUserOp });
    expect(receipt.success).toBe(true);
    expect(receipt.sender).toBe(db.deviceWallet);

    expect(await admin.registry.isESIMWalletValid(db.eSIMWallet)).toBe(db.deviceWallet);

    admin.setDeviceWalletAddress(db.deviceWallet).setESIMWalletAddress(db.eSIMWallet);
    expect(await admin.deviceWallet!.isValidESIMWallet(db.eSIMWallet)).toBe(true);
    expect(await admin.eSIMWallet!.owner()).toBe(db.deviceWallet);

    const { factoryAddresses } = await admin.constants;
    const expected = await target.publicClient.readContract({
      address: factoryAddresses.ESIM_WALLET_FACTORY as Address,
      abi: ESIMWalletFactory,
      functionName: "getCounterFactualAddress",
      args: [db.deviceWallet, E_SIM_SALT],
    });
    expect(expected).toBe(db.eSIMWallet);
    log("5", `verified from step 4's transaction ${link(receipt.receipt.transactionHash)}, no transaction`);
  }, timeout);

  // Unique per run, so a live rerun never collides with an earlier purchase.
  const REF_1 = testBytes32(`fo1-${Date.now()}`);
  let token: Address;
  let quote: bigint;
  let purchaseBlock: bigint;

  it("6. the app buys the bundle, the device wallet sending the tokens in the same operation", async () => {
    token = (await session.paymentAdapter!.resolveAsset(asset)).token;
    quote = await session.paymentAdapter!.quote(asset, bundle.priceUSDCents);
    await target.fund(token, db.deviceWallet, quote * 2n);

    const receipt = await sponsored("6", () => session.eSIMWallet!.buyDataBundleWithTransfer(bundle, asset, quote, REF_1));
    purchaseBlock = receipt.receipt.blockNumber;

    expect(await balanceOf(token, db.deviceWallet)).toBe(quote);
    expect(await balanceOf(token, db.eSIMWallet)).toBe(0n);
    expect(await session.deviceWallet!.canPullFunds(db.eSIMWallet)).toBe(false);
  }, timeout);

  it("7. the backend finds the payment by its reference", async () => {
    const [event] = await target.publicClient.getContractEvents({
      address: db.eSIMWallet,
      abi: ESIMWallet,
      eventName: "DataBundleBoughtWithToken",
      args: { _paymentReference: REF_1 },
      // A real backend starts from its last scanned block; hosted RPCs cap the range.
      fromBlock: purchaseBlock,
    });
    log("7", `payment found in ${link(event.transactionHash)}, no transaction`);

    expect(event.args).toMatchObject({
      _dataBundleID: bundle.id,
      _priceUSDCents: bundle.priceUSDCents,
      _asset: asset,
      _token: token,
      _amountSpent: quote,
    });
  }, timeout);

  const E_SIM_ID = `${TEST_TAG}:esim-${Date.now()}`;

  it("8. the backend records the eSIM's identifier, once", async () => {
    await waitFor("8", await admin.registry.assignESIMIdentifier(db.eSIMWallet, E_SIM_ID));

    expect(await admin.eSIMWallet!.eSIMUniqueIdentifier()).toBe(E_SIM_ID);

    // Refused before sending, so this costs nothing even on a live chain.
    const again = await admin.registry.assignESIMIdentifier(db.eSIMWallet, `${E_SIM_ID}-2`).catch((e: unknown) => e);
    expect(again).toBeInstanceOf(ContractRevertError);
    expect((again as ContractRevertError).decoded?.errorName).toBe("ESIMIdentifierAlreadySet");
  }, timeout);

  it("a top-up repeats steps 6 and 7 on the same eSIM wallet", async () => {
    const REF_2 = testBytes32(`fo2-${Date.now()}`);

    await sponsored("top-up", () => session.eSIMWallet!.buyDataBundleWithTransfer(bundle, asset, quote, REF_2));

    expect(await balanceOf(token, db.deviceWallet)).toBe(0n);
    expect((await session.eSIMWallet!.transactionHistory(1n)).id).toBe(bundle.id);
    expect(await admin.eSIMWallet!.eSIMUniqueIdentifier()).toBe(E_SIM_ID);
  }, timeout);

  otherAssets.forEach((symbol, i) => {
    it(`a purchase can also pay with ${symbol}`, async () => {
      const other = stringToHex(symbol, { size: 32 });
      const otherToken = (await session.paymentAdapter!.resolveAsset(other)).token;
      expect(otherToken).not.toBe(token);
      const otherQuote = await session.paymentAdapter!.quote(other, bundle.priceUSDCents);
      await target.fund(otherToken, db.deviceWallet, otherQuote);
      const ref = testBytes32(`fa${i}-${Date.now()}`);

      const receipt = await sponsored(symbol, () =>
        session.eSIMWallet!.buyDataBundleWithTransfer(bundle, other, otherQuote, ref));

      expect(await balanceOf(otherToken, db.deviceWallet)).toBe(0n);
      expect((await session.eSIMWallet!.transactionHistory(2n + BigInt(i))).id).toBe(bundle.id);
      const [event] = await target.publicClient.getContractEvents({
        address: db.eSIMWallet, abi: ESIMWallet, eventName: "DataBundleBoughtWithToken",
        args: { _paymentReference: ref }, fromBlock: receipt.receipt.blockNumber,
      });
      expect(event.args).toMatchObject({ _asset: other, _token: otherToken, _amountSpent: otherQuote });
    }, timeout);
  });

  // Paid outside the protocol, from an external wallet or by card. The backend
  // confirms the payment offchain, then records it. No money moves onchain.
  const recorded = [
    { label: "from an external wallet", symbol: "USDC", settlement: Settlement.ExternalWallet },
    { label: "by card", symbol: "USD", settlement: Settlement.Fiat },
  ];
  // Everything bought above comes first in the eSIM wallet's history.
  const historyBefore = 2n + BigInt(otherAssets.length);

  recorded.forEach(({ label, symbol, settlement }, i) => {
    it(`a top-up paid ${label} is recorded by the backend`, async () => {
      const recordedAsset = stringToHex(symbol, { size: 32 });
      const { token: recordedToken } = await admin.paymentAdapter.resolveAsset(recordedAsset);
      const tokenAmount = await admin.paymentAdapter.quote(recordedAsset, bundle.priceUSDCents);
      const ref = testBytes32(`ro${i}-${Date.now()}`);
      const details = { ...bundle, settlement };

      const vault = await admin.registry.vault();
      const balances = () => Promise.all([db.deviceWallet, db.eSIMWallet, vault].map((holder) => balanceOf(token, holder)));
      const before = await balances();

      const receipt = await waitFor(label, await admin.registry.recordSettledPurchase(db.eSIMWallet, details, recordedAsset, tokenAmount, ref));

      const [event] = await target.publicClient.getContractEvents({
        address: (await admin.constants).factoryAddresses.REGISTRY as Address,
        abi: Registry,
        eventName: "DataBundleSettled",
        args: { _eSIMWallet: db.eSIMWallet, _paymentReference: ref },
        fromBlock: receipt.blockNumber,
      });
      expect(event.args).toMatchObject({
        _dataBundleID: bundle.id,
        _priceUSDCents: bundle.priceUSDCents,
        _settlement: settlement,
        _asset: recordedAsset,
        _token: recordedToken,
        _tokenAmount: tokenAmount,
      });
      expect(await session.eSIMWallet!.transactionHistory(historyBefore + BigInt(i))).toMatchObject({ id: bundle.id, settlement });
      expect(await admin.registry.usedPaymentReferences(scoped(ref))).toBe(true);
      // Nothing moved: the payment happened outside the protocol.
      expect(await balances()).toEqual(before);
    }, timeout);
  });

  it("the backend cannot record a purchase the contract refuses", async () => {
    const usd = stringToHex("USD", { size: 32 });
    const fiat = { ...bundle, settlement: Settlement.Fiat };
    const cap = await session.eSIMWallet!.priceCapUSDCents();
    const record = (details: typeof bundle, symbol: Hex, ref: Hex) =>
      revertOf(admin.registry.recordSettledPurchase(db.eSIMWallet, details, symbol, 0n, ref));

    // Refused before sending, so none of these costs anything even on a live chain.
    expect(await record(bundle, usd, testBytes32(`rx0-${Date.now()}`))).toBe("SettlementNotAsserted");
    expect(await record(fiat, usd, REF_1)).toBe("PaymentReferenceAlreadyUsed");
    expect(await record({ ...fiat, priceUSDCents: cap + 1n }, usd, testBytes32(`rx1-${Date.now()}`))).toBe("DataBundlePriceAboveCap");
    expect(await record(fiat, testBytes32("coin"), testBytes32(`rx2-${Date.now()}`))).toBe("AssetNotAllowed");
  }, timeout);

  it("a top-up the backend builds as calls and the app signs", async () => {
    const ref = testBytes32(`fb1-${Date.now()}`);
    // Some is already in the eSIM wallet, so the device wallet sends only the rest.
    const held = quote / 2n;
    await target.fund(token, db.eSIMWallet, held);
    await target.fund(token, db.deviceWallet, quote - held);

    // Backend: the "buy" endpoint returns these calls to the app.
    const calls = await admin.calls.buyDataBundleWithTransfer(db.eSIMWallet, bundle, asset, quote, ref);
    expect(calls.map((call) => call.to)).toEqual([token, db.eSIMWallet]);

    // App: signs the calls as given, without knowing what they do.
    const receipt = await sponsored("backend-built", () => session.deviceWallet!.sendUserOperation(calls));

    // Backend: the purchase event is what its webhook receives.
    const [event] = await target.publicClient.getContractEvents({
      address: db.eSIMWallet, abi: ESIMWallet, eventName: "DataBundleBoughtWithToken",
      args: { _paymentReference: ref }, fromBlock: receipt.receipt.blockNumber,
    });
    expect(event.args).toMatchObject({ _dataBundleID: bundle.id, _asset: asset, _token: token, _amountSpent: quote });
    expect(await balanceOf(token, db.deviceWallet)).toBe(0n);
    expect(await balanceOf(token, db.eSIMWallet)).toBe(0n);
  }, timeout);

  it("the eSIM moves to a new device, which signs calls the backend built", async () => {
    // New device: its own passkey and device wallet, set up like steps 1 to 3.
    const next = await createTestUser(target, passkeyGet);
    await sponsored("new device", () => next.kokio.deviceWallet!.sendUserOperation([]), next.client);
    await waitFor("new device", await admin.deviceWalletFactory.postCreateAccount(next.deviceWallet, next.uid, next.signer.ownerKey, next.salt));

    // Old device: asks to hand the eSIM wallet over.
    passkeyGet.mockImplementation(asPasskey(signer));
    const request = await sponsored("transfer request", () => session.eSIMWallet!.requestTransferOwnership(next.deviceWallet));
    expect(await admin.registry.isESIMWalletOnStandby(db.eSIMWallet)).toBe(true);

    // Backend: its webhook receives the request, which names the new device wallet.
    const [event] = await target.publicClient.getContractEvents({
      address: db.eSIMWallet, abi: ESIMWallet, eventName: "OwnershipTransferRequested",
      args: { _newOwner: next.deviceWallet }, fromBlock: request.receipt.blockNumber,
    });
    expect(event.args._currentOwner).toBe(db.deviceWallet);
    const calls = admin.calls.acceptAndBindESIMWallet(db.eSIMWallet, event.args._newOwner!, { grantAccessToFunds: true });

    // New device: signs the calls as given.
    passkeyGet.mockImplementation(asPasskey(next.signer));
    await sponsored("accept and bind", () => next.kokio.deviceWallet!.sendUserOperation(calls), next.client);

    expect(await admin.eSIMWallet!.owner()).toBe(next.deviceWallet);
    expect(await admin.registry.isESIMWalletValid(db.eSIMWallet)).toBe(next.deviceWallet);
    expect(await admin.registry.isESIMWalletOnStandby(db.eSIMWallet)).toBe(false);
    expect(await next.kokio.deviceWallet!.isValidESIMWallet(db.eSIMWallet)).toBe(true);
    expect(await next.kokio.deviceWallet!.canPullFunds(db.eSIMWallet)).toBe(true);
    expect(await session.deviceWallet!.isValidESIMWallet(db.eSIMWallet)).toBe(false);
  }, timeout);

  const link = (hash: Hex) => (target.explorerTx ? `${target.explorerTx}${hash}` : hash);
  const log = (step: string, message: string) => console.log(`[step ${step}] ${message}`);

  const sponsored = async (step: string, send: () => Promise<Hex>, sender: KokioSmartAccountClient = client) => {
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

  // Registry.usedPaymentReferences is keyed per eSIM wallet.
  const scoped = (ref: Hex) =>
    keccak256(encodeAbiParameters([{ type: "address" }, { type: "bytes32" }], [db.eSIMWallet, ref]));

  // The custom error name a refused write carries, as the SDK reports it.
  const revertOf = async (pending: Promise<unknown>): Promise<string> => {
    const err = await pending.then(() => undefined, (e: unknown) => e);
    if (err === undefined) return "did not revert";
    if (!(err instanceof ContractRevertError)) throw err;
    return err.decoded?.errorName ?? `undecoded ${err.data}`;
  };

  const balanceOf = (tokenAddress: Address, holder: Address) =>
    target.publicClient.readContract({ address: tokenAddress, abi: erc20Abi, functionName: "balanceOf", args: [holder] });
});
