import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  createWalletClient, encodeAbiParameters, erc20Abi, http, keccak256, maxUint256, stringToHex,
  type Address, type Hex,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

// The passkey is the one thing Node cannot provide. Everything the SDK does with
// the assertion it returns runs as shipped.
const passkeyGet = vi.hoisted(() => vi.fn());
vi.mock("react-native-passkey", () => ({ Passkey: { get: passkeyGet } }));

import { ContractRevertError, Kokio } from "kokio-sdk";
import { KokioAdmin } from "kokio-sdk/admin";
import { Registry } from "kokio-sdk/abis";
import { Settlement, type KokioSmartAccountClient } from "kokio-sdk/types";

import { impersonateAdmin } from "../utils/forkChain.js";
import { createSoftSigner, type SoftSigner } from "../utils/softP256Signer.js";
import { asPasskey } from "./fixtures/passkeyAuthenticator.js";
import { expectSponsored } from "./fixtures/sponsorship.js";
import { startForkStack, type ForkStack } from "./fixtures/forkStack.js";
import { setTokenBalance } from "./fixtures/tokens.js";
import { CREDENTIAL_ID, RP_ID, testBytes32, testDeviceId } from "./fixtures/testLabels.js";

const REGISTRY: Address = "0x916b6b554119c789EF3026EDeB0E1Ba741b42A49";

// The four things a user does with the app, in order, each as a sponsored user
// operation through the public SDK. Later steps build on the state earlier ones
// leave, so the steps share one fork and run in sequence.
describe("user journey on a Base Sepolia fork", () => {
  let stack: ForkStack;
  let signer: SoftSigner;
  let kokio: Kokio;
  let client: KokioSmartAccountClient;
  let deviceWallet: Address;
  let eSIMWallet: Address;
  let usdc: Address;

  const uid = testDeviceId();
  const salt = BigInt(Date.now());

  beforeAll(async () => {
    stack = await startForkStack();

    signer = createSoftSigner(RP_ID);
    passkeyGet.mockImplementation(asPasskey(signer));

    // The app's own wallet client. The passkey signs user operations; this
    // client only carries the chain and RPC.
    const walletClient = createWalletClient({
      account: privateKeyToAccount(generatePrivateKey()),
      chain: baseSepolia,
      transport: http(stack.fork.rpcUrl),
    });

    const setup = new Kokio(walletClient, CREDENTIAL_ID, RP_ID, "unused-on-fork", "unused-on-fork");
    const account = await setup.smartAccount.getSmartWallet(uid, signer.ownerKey, salt);
    client = await setup.smartAccount.getSmartWalletClient(account, { bundlerUrl: stack.bundlerUrl });

    deviceWallet = account.address;
    kokio = new Kokio(walletClient, CREDENTIAL_ID, RP_ID, "unused-on-fork", "unused-on-fork", client, deviceWallet);
  }, 180_000);

  afterAll(async () => {
    await stack?.stop();
  });

  it("deploys the device wallet with its first sponsored user operation", async () => {
    expect(await kokio.deviceWalletFactory!.getAddress(uid, signer.ownerKey, salt)).toBe(deviceWallet);
    expect(await stack.fork.publicClient.getCode({ address: deviceWallet })).toBeUndefined();

    await expectSponsored(client, stack.fork.publicClient, () => kokio.deviceWallet!.sendUserOperation([]));

    expect(await stack.fork.publicClient.getCode({ address: deviceWallet })).toMatch(/^0x[0-9a-f]+$/i);
    expect(await kokio.deviceWallet!.getOwner()).toEqual(signer.ownerKey);
    expect(await kokio.deviceWallet!.deviceUniqueIdentifier()).toBe(uid);
  }, 120_000);

  it("is registered by the backend after the permissionless deploy", async () => {
    // createAccount through the EntryPoint cannot write to the registry, so the
    // backend records the wallet afterwards (DeviceWalletFactory.postCreateAccount).
    const read = () => stack.fork.publicClient.readContract({
      address: REGISTRY, abi: Registry, functionName: "isDeviceWalletValid", args: [deviceWallet],
    });
    expect(await read()).toBe(false);

    const { client: adminClient } = await impersonateAdmin(stack.fork);
    const hash = await new KokioAdmin(adminClient).deviceWalletFactory.postCreateAccount(deviceWallet, uid, signer.ownerKey, salt);
    await stack.fork.publicClient.waitForTransactionReceipt({ hash });

    expect(await read()).toBe(true);
    expect(await kokio.deviceWalletFactory!.deviceWalletInfoAdded(deviceWallet)).toBe(true);
  }, 120_000);

  it("deploys and binds an eSIM wallet as the user", async () => {
    const predicted = await kokio.eSIMWalletFactory!.getCounterFactualAddress(deviceWallet, ESIM_SALT);

    const { eSIMWalletAddress } = await expectSponsoredResult(() =>
      kokio.deviceWallet!.deployAndBindESIMWallet(ESIM_SALT));

    expect(eSIMWalletAddress).toBe(predicted);
    eSIMWallet = eSIMWalletAddress;
    kokio.setESIMWalletAddress(eSIMWallet);

    expect(await kokio.eSIMWallet!.owner()).toBe(deviceWallet);
    expect(await kokio.deviceWallet!.isValidESIMWallet(eSIMWallet)).toBe(true);
    expect(await readRegistry("isESIMWalletValid", [eSIMWallet])).toBe(deviceWallet);
    // A bind never carries fund access.
    expect(await kokio.deviceWallet!.canPullFunds(eSIMWallet)).toBe(false);
  }, 120_000);

  it("grants the eSIM wallet access to the device wallet's tokens", async () => {
    await expectSponsored(client, stack.fork.publicClient, () =>
      kokio.deviceWallet!.toggleAccessToFunds(eSIMWallet, true));

    expect(await kokio.deviceWallet!.canPullFunds(eSIMWallet)).toBe(true);
  }, 120_000);

  it("buys a data bundle, pulling the tokens from the device wallet", async () => {
    const { token } = await kokio.paymentAdapter!.resolveAsset(USDC);
    usdc = token;
    const quote = await kokio.paymentAdapter!.quote(USDC, BUNDLE.priceUSDCents);
    expect(quote).toBe(5_000_000n); // 500 cents in 6-decimal USDC

    await setTokenBalance(stack.fork, usdc, deviceWallet, 20_000_000n);
    const vault = await readRegistry("vault", []) as Address;
    const vaultBefore = await balanceOf(usdc, vault);

    await expectSponsored(client, stack.fork.publicClient, () =>
      kokio.eSIMWallet!.buyDataBundleWithToken(BUNDLE, USDC, quote, REF_1));

    expect(await balanceOf(usdc, deviceWallet)).toBe(20_000_000n - quote);
    expect(await balanceOf(usdc, vault)).toBe(vaultBefore + quote);
    expect(await kokio.eSIMWallet!.transactionHistory(0n)).toMatchObject({
      id: BUNDLE.id,
      priceUSDCents: BUNDLE.priceUSDCents,
      settlement: Settlement.DeviceWallet,
    });
    expect(await readRegistry("usedPaymentReferences", [scopedReference(eSIMWallet, REF_1)])).toBe(true);
  }, 120_000);

  it("refuses a payment reference the eSIM wallet already spent", async () => {
    const quote = await kokio.paymentAdapter!.quote(USDC, BUNDLE.priceUSDCents);

    expect(await revertOf(kokio.eSIMWallet!.buyDataBundleWithToken(BUNDLE, USDC, quote, REF_1)))
      .toBe("PaymentReferenceAlreadyUsed");
  }, 120_000);

  it("refuses a price above the cap and a quote above maxAmountIn", async () => {
    const quote = await kokio.paymentAdapter!.quote(USDC, BUNDLE.priceUSDCents);
    const cap = await readRegistry("defaultPriceCapUSDCents", []) as bigint;

    expect(await revertOf(kokio.eSIMWallet!.buyDataBundleWithToken(
      { ...BUNDLE, priceUSDCents: cap + 1n }, USDC, maxUint256, REF_2,
    ))).toBe("DataBundlePriceAboveCap");

    expect(await revertOf(kokio.eSIMWallet!.buyDataBundleWithToken(BUNDLE, USDC, quote - 1n, REF_2)))
      .toBe("SettlementAboveMax");
  }, 120_000);

  it("stops pulling tokens once access is revoked", async () => {
    await expectSponsored(client, stack.fork.publicClient, () =>
      kokio.deviceWallet!.toggleAccessToFunds(eSIMWallet, false));
    expect(await kokio.deviceWallet!.canPullFunds(eSIMWallet)).toBe(false);

    const quote = await kokio.paymentAdapter!.quote(USDC, BUNDLE.priceUSDCents);
    expect(await revertOf(kokio.eSIMWallet!.buyDataBundleWithToken(BUNDLE, USDC, quote, REF_2)))
      .toBe("FundsAccessRevoked");
  }, 120_000);

  it("buys without pull access by sending the tokens in the same user operation", async () => {
    const quote = await kokio.paymentAdapter!.quote(USDC, BUNDLE.priceUSDCents);
    const before = await balanceOf(usdc, deviceWallet);

    await expectSponsored(client, stack.fork.publicClient, () =>
      kokio.eSIMWallet!.buyDataBundleWithTransfer(BUNDLE, USDC, quote, REF_2));

    expect(await balanceOf(usdc, deviceWallet)).toBe(before - quote);
    expect(await balanceOf(usdc, eSIMWallet)).toBe(0n);
    expect((await kokio.eSIMWallet!.transactionHistory(1n)).id).toBe(BUNDLE.id);
  }, 120_000);

  it("deploys, binds and grants access to a second eSIM wallet in one user operation", async () => {
    const { eSIMWalletAddress } = await expectSponsoredResult(() =>
      kokio.deviceWallet!.deployAndBindESIMWallet(ESIM_SALT + 1n, { grantAccessToFunds: true }));

    expect(await kokio.deviceWallet!.isValidESIMWallet(eSIMWalletAddress)).toBe(true);
    expect(await kokio.deviceWallet!.canPullFunds(eSIMWalletAddress)).toBe(true);
  }, 120_000);

  // Helpers bound to this suite's fork and client.

  const readRegistry = (functionName: string, args: readonly unknown[]) =>
    stack.fork.publicClient.readContract({ address: REGISTRY, abi: Registry, functionName, args } as never);

  const balanceOf = (token: Address, holder: Address) =>
    stack.fork.publicClient.readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [holder] });

  // For helpers that return the user operation hash alongside other values.
  const expectSponsoredResult = async <T extends { userOpHash: Hex }>(send: () => Promise<T>) => {
    let result!: T;
    await expectSponsored(client, stack.fork.publicClient, async () => (result = await send()).userOpHash);
    return result;
  };
});

const ESIM_SALT = 1n;
const USDC = stringToHex("USDC", { size: 32 });
const BUNDLE = { id: testBytes32("bundle-1"), priceUSDCents: 500n, settlement: Settlement.DeviceWallet };
const REF_1 = testBytes32("order-1");
const REF_2 = testBytes32("order-2");

// Registry.usedPaymentReferences is keyed per eSIM wallet (Registry.sol:474).
const scopedReference = (eSIMWallet: Address, ref: Hex) =>
  keccak256(encodeAbiParameters([{ type: "address" }, { type: "bytes32" }], [eSIMWallet, ref]));

// The custom error name a rejected user operation carries, as the SDK reports it.
const revertOf = async (pending: Promise<unknown>): Promise<string> => {
  const err = await pending.then(() => undefined, (e: unknown) => e);
  if (err === undefined) return "did not revert";
  if (!(err instanceof ContractRevertError)) throw err;
  return err.decoded?.errorName ?? `undecoded ${err.data}`;
};
