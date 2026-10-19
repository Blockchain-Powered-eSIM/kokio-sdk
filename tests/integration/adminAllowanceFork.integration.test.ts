import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getContract, parseUnits, stringToHex, type Address, type Hex, type WalletClient } from "viem";

import { DeviceWalletFactory, ESIMWallet } from "../../src/abis/index.js";
import { KokioAdmin } from "../../src/admin/config-admin.js";
import { _adminAllowanceUSDCents, _buyDataBundleWithToken, _setAdminAllowanceUSDCents } from "../../src/logic/eSIMWallet.js";
import { _getESIMWalletCounterFactualAddress } from "../../src/logic/eSIMWalletFactory.js";
import { _quote } from "../../src/logic/paymentAdapter.js";
import { _defaultAdminAllowanceUSDCents } from "../../src/logic/registry.js";
import { AdminAllowanceExceededError, toContractRevertError } from "../../src/logic/errors.js";
import { Settlement, type DataBundleDetails, type KokioSmartAccountClient } from "../../src/types.js";
import { forkAvailable, impersonateAdmin, impersonatedSmartAccount, startFork, type Fork } from "../utils/forkChain.js";
import { createSoftSigner } from "../utils/softP256Signer.js";
import { setTokenBalance } from "../consumer/fixtures/tokens.js";

// Native USDC on Base, the settlement token the mainnet adapter is configured with.
const USDC_TOKEN: Address = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const USDC = stringToHex("USDC", { size: 32 });
const PRICE = 1_000n;

let order = 0;
const nextRef = (): Hex => stringToHex(`allowance-fork:order-${++order}`, { size: 32 });
const bundle = (): DataBundleDetails => ({
  id: stringToHex(`allowance-fork:bundle-${order}`, { size: 32 }),
  priceUSDCents: PRICE,
  settlement: Settlement.DeviceWallet,
});

// The admin allowance on a Base mainnet fork, against the deployed contracts.
// Skips cleanly unless INTEGRATION=1 and Foundry is installed.
describe.skipIf(!forkAvailable())("admin allowance on a Base mainnet fork", () => {
  let fork: Fork;
  let adminClient: WalletClient;
  let admin: KokioAdmin;
  let user: KokioSmartAccountClient;
  let eSIMWallet: Address;

  const adminBuy = async () => {
    const quote = await _quote(user, USDC, PRICE);
    const hash = await admin.eSIMWallet!.buyDataBundleWithToken(bundle(), USDC, quote, nextRef());
    await fork.publicClient.waitForTransactionReceipt({ hash });
  };

  beforeAll(async () => {
    fork = await startFork(undefined, undefined, "base");
    const owner = createSoftSigner();

    const factory = getContract({
      abi: DeviceWalletFactory,
      address: fork.addresses.DEVICE_WALLET_FACTORY,
      client: { public: fork.publicClient, wallet: fork.funded },
    });

    const uid = "fork-allowance-device";
    const deviceWallet = (await factory.read.getCounterFactualAddress([owner.ownerKey, uid, 0n])) as Address;
    const deploy = await factory.write.createAccount([uid, owner.ownerKey, 0n], { value: 0n });
    await fork.publicClient.waitForTransactionReceipt({ hash: deploy });

    ({ client: adminClient } = await impersonateAdmin(fork));
    admin = new KokioAdmin(adminClient, deviceWallet);
    const record = await admin.deviceWalletFactory.postCreateAccount(deviceWallet, uid, owner.ownerKey, 0n);
    await fork.publicClient.waitForTransactionReceipt({ hash: record });

    user = await impersonatedSmartAccount(fork, deviceWallet);
    eSIMWallet = await _getESIMWalletCounterFactualAddress(user, deviceWallet, 1n);
    const deployESIM = await admin.deviceWallet!.deployESIMWallet(1n);
    await fork.publicClient.waitForTransactionReceipt({ hash: deployESIM });
    admin.setESIMWalletAddress(eSIMWallet);

    // Tokens held by the eSIM wallet itself are spent first, so no access grant is needed.
    await setTokenBalance(fork, USDC_TOKEN, eSIMWallet, parseUnits("100", 6));
  }, 180_000);

  afterAll(async () => {
    await fork?.stop();
  });

  it("starts a new eSIM wallet at the registry default", async () => {
    const fallback = await _defaultAdminAllowanceUSDCents(user);

    expect(fallback).toBe(2_500n);
    expect(await _adminAllowanceUSDCents(user, eSIMWallet)).toBe(fallback);
  }, 60_000);

  it("lowers the allowance with each admin purchase", async () => {
    await adminBuy();
    await adminBuy();

    expect(await _adminAllowanceUSDCents(user, eSIMWallet)).toBe(500n);
  }, 120_000);

  it("refuses an admin purchase above what is left, before sending", async () => {
    const err = await adminBuy().catch((e) => e);

    expect(err).toBeInstanceOf(AdminAllowanceExceededError);
    expect(err.remainingUSDCents).toBe(500n);
  }, 60_000);

  it("is refused by the contract too, and the SDK decodes it", async () => {
    const quote = await _quote(user, USDC, PRICE);
    const err = await fork.publicClient
      .simulateContract({
        account: adminClient.account!,
        address: eSIMWallet,
        abi: ESIMWallet,
        functionName: "buyDataBundleWithToken",
        args: [bundle(), USDC, quote, nextRef()],
      })
      .catch((e) => e);

    expect(toContractRevertError(err)?.decoded).toEqual({ errorName: "AdminAllowanceExceeded", args: [PRICE, 500n] });
  }, 60_000);

  it("does not spend the allowance on the owner's own purchase", async () => {
    const quote = await _quote(user, USDC, PRICE);
    await _buyDataBundleWithToken(user, eSIMWallet, bundle(), USDC, quote, nextRef());

    expect(await _adminAllowanceUSDCents(user, eSIMWallet)).toBe(500n);
  }, 60_000);

  it("lets the owner raise it so the admin can buy again", async () => {
    await _setAdminAllowanceUSDCents(user, eSIMWallet, 5_000n);
    await adminBuy();

    expect(await _adminAllowanceUSDCents(user, eSIMWallet)).toBe(4_000n);
  }, 120_000);
});
