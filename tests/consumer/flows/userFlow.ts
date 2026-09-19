import { afterAll, beforeAll, describe, expect, it, type Mock } from "vitest";
import { createWalletClient, erc20Abi, http, stringToHex, type Address, type Hex, type PublicClient } from "viem";
import { createBundlerClient } from "viem/account-abstraction";
import { baseSepolia } from "viem/chains";
import { ContractRevertError, Kokio } from "kokio-sdk";
import type { KokioAdmin } from "kokio-sdk/admin";
import { ESIMWallet, ESIMWalletFactory } from "kokio-sdk/abis";
import { Settlement, type KokioSmartAccountClient } from "kokio-sdk/types";

import { createSoftSigner } from "../../utils/softP256Signer.js";
import { asPasskey } from "../fixtures/passkeyAuthenticator.js";
import { expectSponsored } from "../fixtures/sponsorship.js";
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

  const link = (hash: Hex) => (target.explorerTx ? `${target.explorerTx}${hash}` : hash);
  const log = (step: string, message: string) => console.log(`[step ${step}] ${message}`);

  const sponsored = async (step: string, send: () => Promise<Hex>) => {
    const receipt = await expectSponsored(client, target.publicClient, send, { confirmations: target.confirmations });
    log(step, `user operation ${receipt.userOpHash}, transaction ${link(receipt.receipt.transactionHash)}`);
    return receipt;
  };

  const waitFor = async (step: string, hash: Hex) => {
    const { status } = await target.publicClient.waitForTransactionReceipt({ hash, confirmations: target.confirmations });
    log(step, `transaction ${link(hash)}`);
    expect(status).toBe("success");
  };

  const balanceOf = (tokenAddress: Address, holder: Address) =>
    target.publicClient.readContract({ address: tokenAddress, abi: erc20Abi, functionName: "balanceOf", args: [holder] });
});
