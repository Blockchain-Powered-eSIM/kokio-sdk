import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { stringToHex, type Address } from "viem";

const passkeyGet = vi.hoisted(() => vi.fn());
vi.mock("react-native-passkey", () => ({ Passkey: { get: passkeyGet } }));

import { ContractRevertError } from "kokio-sdk";
import { Settlement } from "kokio-sdk/types";

import { expectSponsored } from "./fixtures/sponsorship.js";
import { confirmed, fundFromAdmin, startLiveStack, type LiveStack } from "./fixtures/liveStack.js";
import { testBytes32 } from "./fixtures/testLabels.js";
import { createTestUser, type TestUser } from "./fixtures/user.js";

// The test token, so live runs never spend Circle USDC.
const USDC = stringToHex("USDCt", { size: 32 });
// $1.00, so a run costs 1 USDCt, paid to the protocol vault.
const BUNDLE = { id: testBytes32("live-bundle"), priceUSDCents: 100n, settlement: Settlement.DeviceWallet };
// Unique per run, so a rerun never collides with an earlier purchase.
const REF = testBytes32(`o-${Date.now()}`);
// Hosted RPCs can answer from a node a block behind, so let each write settle.
const SETTLED = { confirmations: 3 };

// The user journey on Base Sepolia with the real Pimlico bundler and paymaster.
// Every user operation must be sponsored: the device wallet never holds ETH.
// Sends real testnet transactions. Run with `npm run test:consumer:live`.
describe("user journey on Base Sepolia with Pimlico", () => {
  let live: LiveStack;
  let user: TestUser;
  let eSIMWallet: Address;

  beforeAll(async () => {
    live = await startLiveStack();
    user = await createTestUser(live.target, passkeyGet);
  }, 120_000);

  afterAll(() => {
    // Recorded so a failed run can be looked up on a block explorer.
    console.log(`device wallet ${user?.deviceWallet}, eSIM wallet ${eSIMWallet}`);
  });

  it("deploys the device wallet with a sponsored user operation", async () => {
    await expectSponsored(user.client, live.publicClient, () => user.kokio.deviceWallet!.sendUserOperation([]), SETTLED);
    expect(await live.publicClient.getCode({ address: user.deviceWallet })).toMatch(/^0x[0-9a-f]+$/i);
  }, 180_000);

  it("is registered by the backend, signing with its own key over a hosted RPC", async () => {
    const hash = await live.admin.deviceWalletFactory.postCreateAccount(
      user.deviceWallet, user.uid, user.signer.ownerKey, user.salt,
    );
    await confirmed(live, hash);

    expect(await live.admin.registry.isDeviceWalletValid(user.deviceWallet)).toBe(true);
  }, 180_000);

  it("deploys, binds and grants access to an eSIM wallet in one sponsored user operation", async () => {
    let result!: { userOpHash: `0x${string}`; eSIMWalletAddress: Address };
    await expectSponsored(user.client, live.publicClient, async () => {
      result = await user.kokio.deviceWallet!.deployAndBindESIMWallet(1n, { grantAccessToFunds: true });
      return result.userOpHash;
    }, SETTLED);

    eSIMWallet = result.eSIMWalletAddress;
    user.kokio.setESIMWalletAddress(eSIMWallet);
    expect(await user.kokio.deviceWallet!.isValidESIMWallet(eSIMWallet)).toBe(true);
    expect(await user.kokio.deviceWallet!.canPullFunds(eSIMWallet)).toBe(true);
  }, 180_000);

  it("buys a data bundle with a sponsored user operation", async () => {
    const { token } = await user.kokio.paymentAdapter!.resolveAsset(USDC);
    const quote = await user.kokio.paymentAdapter!.quote(USDC, BUNDLE.priceUSDCents);
    await fundFromAdmin(live, token, user.deviceWallet, quote);

    await expectSponsored(user.client, live.publicClient, () =>
      user.kokio.eSIMWallet!.buyDataBundleWithToken(BUNDLE, USDC, quote, REF), SETTLED);

    expect((await user.kokio.eSIMWallet!.transactionHistory(0n)).id).toBe(BUNDLE.id);
  }, 180_000);

  it("refuses a spent payment reference with a decoded error from Pimlico", async () => {
    const quote = await user.kokio.paymentAdapter!.quote(USDC, BUNDLE.priceUSDCents);
    const err = await user.kokio.eSIMWallet!.buyDataBundleWithToken(BUNDLE, USDC, quote, REF).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ContractRevertError);
    expect((err as ContractRevertError).decoded?.errorName).toBe("PaymentReferenceAlreadyUsed");
  }, 180_000);
});
