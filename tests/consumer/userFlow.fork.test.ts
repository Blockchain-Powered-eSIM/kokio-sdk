import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createWalletClient, erc20Abi, http, parseEther, stringToHex, type Address, type Hex } from "viem";
import { createBundlerClient } from "viem/account-abstraction";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const passkeyGet = vi.hoisted(() => vi.fn());
vi.mock("react-native-passkey", () => ({ Passkey: { get: passkeyGet } }));

import { ContractRevertError, Kokio } from "kokio-sdk";
import { KokioAdmin } from "kokio-sdk/admin";
import { ESIMWallet, ESIMWalletFactory } from "kokio-sdk/abis";
import { Settlement, type KokioSmartAccountClient } from "kokio-sdk/types";

import { impersonateRegistryOwner } from "../utils/forkChain.js";
import { createSoftSigner } from "../utils/softP256Signer.js";
import { asPasskey } from "./fixtures/passkeyAuthenticator.js";
import { expectSponsored } from "./fixtures/sponsorship.js";
import { startForkStack, type ForkStack } from "./fixtures/forkStack.js";
import { setTokenBalance } from "./fixtures/tokens.js";
import { CREDENTIAL_ID, FORK_POLICY_ID, RP_ID, TEST_TAG, testBytes32, testDeviceId } from "./fixtures/testLabels.js";

const USDC = stringToHex("USDC", { size: 32 });
const BUNDLE = { id: testBytes32("flow-bundle"), priceUSDCents: 500n, settlement: Settlement.DeviceWallet };
const E_SIM_SALT = 1n;

// Signup to an eSIM identifier onchain, in the order an app and its backend run
// it, with the backend's side done through KokioAdmin. Later steps build on earlier ones.
describe("documented user flow on a Base Sepolia fork", () => {
  let stack: ForkStack;
  let admin: KokioAdmin;

  // What the backend stores against the user at signup.
  const db = {
    uid: testDeviceId(),
    salt: BigInt(Date.now()),
    ownerKey: undefined as unknown as readonly [Hex, Hex],
    deviceWallet: undefined as unknown as Address,
    eSIMWallet: undefined as unknown as Address,
  };
  const signer = createSoftSigner(RP_ID);
  db.ownerKey = signer.ownerKey;

  let session: Kokio;
  let client: KokioSmartAccountClient;

  beforeAll(async () => {
    stack = await startForkStack();
    passkeyGet.mockImplementation(asPasskey(signer));

    // The backend signs with its own private key, as it would against a hosted RPC.
    const account = privateKeyToAccount(generatePrivateKey());
    await stack.fork.testClient.setBalance({ address: account.address, value: parseEther("1") });
    admin = new KokioAdmin(createWalletClient({ account, chain: baseSepolia, transport: http(stack.fork.rpcUrl) }));

    const { client: owner } = await impersonateRegistryOwner(stack.fork);
    await waitFor(await new KokioAdmin(owner).registry.requestAdminUpdate(account.address));
    await waitFor(await admin.registry.acceptAdminUpdate());
  }, 180_000);

  afterAll(async () => {
    await stack?.stop();
  });

  it("0. the backend works out the device wallet address at signup", async () => {
    db.deviceWallet = await admin.deviceWalletFactory.getCounterFactualAddress(db.ownerKey, db.uid, db.salt);

    expect(await stack.fork.publicClient.getCode({ address: db.deviceWallet })).toBeUndefined();
  }, 60_000);

  it("1. the app resolves the same smart account from the passkey", async () => {
    const walletClient = createWalletClient({ chain: baseSepolia, transport: http(stack.fork.rpcUrl) });
    const kokio = new Kokio(walletClient, CREDENTIAL_ID, RP_ID, "unused-on-fork", FORK_POLICY_ID);

    const account = await kokio.smartAccount.getSmartWallet(db.uid, db.ownerKey, db.salt);
    expect(account.address).toBe(db.deviceWallet);

    client = await kokio.smartAccount.getSmartWalletClient(account, { bundlerUrl: stack.bundlerUrl });
    session = new Kokio(walletClient, CREDENTIAL_ID, RP_ID, "unused-on-fork", FORK_POLICY_ID, client, account.address);
  }, 60_000);

  it("2. the app deploys the device wallet with a sponsored user operation", async () => {
    await expectSponsored(client, stack.fork.publicClient, () => session.deviceWallet!.sendUserOperation([]));

    expect(await stack.fork.publicClient.getCode({ address: db.deviceWallet })).toMatch(/^0x[0-9a-f]+$/i);
    expect(await admin.registry.isDeviceWalletValid(db.deviceWallet)).toBe(false);
  }, 120_000);

  it("3. the backend registers the device wallet from its own records", async () => {
    await waitFor(await admin.deviceWalletFactory.postCreateAccount(db.deviceWallet, db.uid, db.ownerKey, db.salt));

    expect(await admin.registry.isDeviceWalletValid(db.deviceWallet)).toBe(true);
  }, 60_000);

  let bindUserOp: Hex;

  it("4. the app deploys and binds an eSIM wallet without granting fund access", async () => {
    await expectSponsored(client, stack.fork.publicClient, async () => {
      const result = await session.deviceWallet!.deployAndBindESIMWallet(E_SIM_SALT, { grantAccessToFunds: false });
      db.eSIMWallet = result.eSIMWalletAddress;
      return (bindUserOp = result.userOpHash);
    });
    session.setESIMWalletAddress(db.eSIMWallet);

    expect(await session.deviceWallet!.canPullFunds(db.eSIMWallet)).toBe(false);
  }, 120_000);

  it("5. the backend verifies the eSIM wallet belongs to this user's device wallet", async () => {
    // The app sends only { eSIMWallet, eSIMSalt, userOpHash }. The device wallet
    // comes from the backend's own records.
    const bundler = createBundlerClient({ transport: http(stack.bundlerUrl) });
    const receipt = await bundler.waitForUserOperationReceipt({ hash: bindUserOp });
    expect(receipt.success).toBe(true);
    expect(receipt.sender).toBe(db.deviceWallet);

    expect(await admin.registry.isESIMWalletValid(db.eSIMWallet)).toBe(db.deviceWallet);

    admin.setDeviceWalletAddress(db.deviceWallet).setESIMWalletAddress(db.eSIMWallet);
    expect(await admin.deviceWallet!.isValidESIMWallet(db.eSIMWallet)).toBe(true);
    expect(await admin.eSIMWallet!.owner()).toBe(db.deviceWallet);

    const { factoryAddresses } = await admin.constants;
    const expected = await stack.fork.publicClient.readContract({
      address: factoryAddresses.ESIM_WALLET_FACTORY as Address,
      abi: ESIMWalletFactory,
      functionName: "getCounterFactualAddress",
      args: [db.deviceWallet, E_SIM_SALT],
    });
    expect(expected).toBe(db.eSIMWallet);
  }, 120_000);

  const REF_1 = testBytes32("flow-order-1");
  let usdc: Address;
  let quote: bigint;
  let purchaseBlock: bigint;

  it("6. the app buys the bundle, the device wallet sending the tokens in the same operation", async () => {
    usdc = (await session.paymentAdapter!.resolveAsset(USDC)).token;
    quote = await session.paymentAdapter!.quote(USDC, BUNDLE.priceUSDCents);
    await setTokenBalance(stack.fork, usdc, db.deviceWallet, quote * 2n);

    const receipt = await expectSponsored(client, stack.fork.publicClient, () =>
      session.eSIMWallet!.buyDataBundleWithTransfer(BUNDLE, USDC, quote, REF_1));
    purchaseBlock = receipt.receipt.blockNumber;

    expect(await balanceOf(usdc, db.deviceWallet)).toBe(quote);
    expect(await balanceOf(usdc, db.eSIMWallet)).toBe(0n);
    expect(await session.deviceWallet!.canPullFunds(db.eSIMWallet)).toBe(false);
  }, 120_000);

  it("7. the backend finds the payment by its reference", async () => {
    const [event] = await stack.fork.publicClient.getContractEvents({
      address: db.eSIMWallet,
      abi: ESIMWallet,
      eventName: "DataBundleBoughtWithToken",
      args: { _paymentReference: REF_1 },
      // A real backend starts from its last scanned block; hosted RPCs cap the range.
      fromBlock: purchaseBlock,
    });

    expect(event.args).toMatchObject({
      _dataBundleID: BUNDLE.id,
      _priceUSDCents: BUNDLE.priceUSDCents,
      _asset: USDC,
      _token: usdc,
      _amountSpent: quote,
    });
  }, 60_000);

  const E_SIM_ID = `${TEST_TAG}:esim-${Date.now()}`;

  it("8. the backend records the eSIM's identifier, once", async () => {
    await waitFor(await admin.registry.assignESIMIdentifier(db.eSIMWallet, E_SIM_ID));

    expect(await admin.eSIMWallet!.eSIMUniqueIdentifier()).toBe(E_SIM_ID);

    const again = await admin.registry.assignESIMIdentifier(db.eSIMWallet, `${E_SIM_ID}-2`).catch((e: unknown) => e);
    expect(again).toBeInstanceOf(ContractRevertError);
    expect((again as ContractRevertError).decoded?.errorName).toBe("ESIMIdentifierAlreadySet");
  }, 60_000);

  it("a top-up repeats steps 6 and 7 on the same eSIM wallet", async () => {
    const REF_2 = testBytes32("flow-order-2");

    await expectSponsored(client, stack.fork.publicClient, () =>
      session.eSIMWallet!.buyDataBundleWithTransfer(BUNDLE, USDC, quote, REF_2));

    expect(await balanceOf(usdc, db.deviceWallet)).toBe(0n);
    expect((await session.eSIMWallet!.transactionHistory(1n)).id).toBe(BUNDLE.id);
    expect(await admin.eSIMWallet!.eSIMUniqueIdentifier()).toBe(E_SIM_ID);
  }, 120_000);

  const waitFor = async (hash: Hex) => {
    const { status } = await stack.fork.publicClient.waitForTransactionReceipt({ hash });
    expect(status).toBe("success");
  };

  const balanceOf = (token: Address, holder: Address) =>
    stack.fork.publicClient.readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [holder] });
});
