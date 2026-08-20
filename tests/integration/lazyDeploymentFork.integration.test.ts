import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { getContract, toHex, type Address } from "viem";
import { p256 } from "@noble/curves/nist.js";

// `createSmartAccount.ts` (pulled in transitively) statically imports
// `react-native-passkey`, a native module Node's loader cannot parse. This suite
// never signs a passkey, so stub it out of the graph as the other suites do.
vi.mock("react-native-passkey", () => ({ Passkey: {} }));

import { KokioAdmin } from "../../src/admin/config-admin.js";
import { LazyWalletRegistry } from "../../src/abis/index.js";
import { baseSepoliaFactoryAddresses } from "../../src/logic/constants.js";
import {
  MAX_ESIM_WALLETS_PER_CALL,
  MAX_HISTORY_ENTRIES_PER_CALL,
} from "../../src/logic/admin/lazyWalletRegistry.eoa.js";
import type { DataBundleDetails, P256Key } from "../../src/types.js";
import { forkAvailable, impersonateAdmin, startFork, type Fork } from "../utils/forkChain.js";

const F = baseSepoliaFactoryAddresses;

// A fresh P256 public key per device. The factory registers each key's hash and
// refuses reuse against a different counterfactual address.
const freshOwnerKey = (): P256Key => {
  const pub = p256.getPublicKey(p256.utils.randomSecretKey(), false); // 0x04 ‖ X(32) ‖ Y(32)
  return [toHex(pub.slice(1, 33)), toHex(pub.slice(33, 65))];
};

const bundles = (count: number): DataBundleDetails[] =>
  Array.from({ length: count }, (_, i) => ({ dataBundleID: `bundle-${i}`, dataBundlePrice: BigInt(i + 1) }));

const readLazy = (fork: Fork) => getContract({
  abi: LazyWalletRegistry,
  address: F.LAZY_WALLET_REGISTRY,
  client: fork.publicClient,
});

// The paginated lazy flows against a local Base Sepolia fork. The mocked unit
// tests prove the loop's shape; this proves the loop reads the real events off
// the real contracts, which is the part a mock cannot check. Skips cleanly
// unless INTEGRATION=1 and Foundry is installed.
describe.skipIf(!forkAvailable())("Lazy deployment - pagination on a Base Sepolia fork", () => {
  let fork: Fork;
  let sdk: KokioAdmin;

  beforeAll(async () => {
    fork = await startFork(8548);
    sdk = new KokioAdmin((await impersonateAdmin(fork)).client);
  }, 60_000);

  afterAll(async () => {
    await fork?.stop();
  });

  // The SDK carries the caps as constants rather than reading them per call, so
  // this is what would catch an upgrade that moved one.
  it("the caps the SDK bounds its batches against match the deployed contract", async () => {
    expect(await sdk.lazyWalletRegistry.MAX_ESIM_WALLETS_PER_CALL()).toBe(MAX_ESIM_WALLETS_PER_CALL);
    expect(await sdk.lazyWalletRegistry.MAX_HISTORY_ENTRIES_PER_CALL()).toBe(MAX_HISTORY_ENTRIES_PER_CALL);
  }, 60_000);

  it(
    "deploys a device whose eSIMs span several batches, then resumes to a no-op",
    async () => {
      const device = "fork-lazy-paged-device";
      const eSIMs = Array.from({ length: 5 }, (_, i) => `${device}-esim-${i}`);
      const lazy = readLazy(fork);

      // One purchase per eSIM. All history has to be recorded before the first
      // batch, since that batch creates the device wallet and the contract then
      // refuses any further history for the device.
      const populate = await sdk.lazyWalletRegistry.batchPopulateHistory(
        [device],
        [eSIMs],
        [bundles(eSIMs.length)],
      );
      expect((await fork.publicClient.waitForTransactionReceipt({ hash: populate })).status).toBe("success");

      // Two at a time over five eSIMs, so the SDK has to run three transactions.
      const result = await sdk.lazyWalletRegistry.deployLazyWalletAndSetESIMIdentifier(
        freshOwnerKey(),
        device,
        7_101n,
        0n,
        2n,
      );

      expect(result.alreadyComplete).toBe(false);
      expect(result.batches).toHaveLength(3);
      expect(result.batches.map((batch) => batch.remaining)).toEqual([3n, 1n, 0n]);
      expect(result.eSIMWallets).toHaveLength(5);
      expect(result.eSIMIdentifiers).toEqual(eSIMs);

      // The cursor reached the end, and every address the events reported is a
      // contract rather than an address the SDK guessed at.
      expect(await lazy.read.eSIMWalletsDeployed([device])).toBe(5n);
      for (const wallet of [result.deviceWallet, ...result.eSIMWallets]) {
        expect(await fork.publicClient.getCode({ address: wallet })).not.toBe("0x");
      }

      // Running it again finds nothing to do and sends no transaction.
      const again = await sdk.lazyWalletRegistry.deployLazyWalletAndSetESIMIdentifier(
        freshOwnerKey(),
        device,
        7_101n,
        0n,
        2n,
      );
      expect(again.alreadyComplete).toBe(true);
      expect(again.batches).toEqual([]);
      expect(again.deviceWallet).toBe(result.deviceWallet);
    },
    300_000,
  );

  it(
    "copies a history longer than one batch, then resumes to a no-op",
    async () => {
      const device = "fork-lazy-history-device";
      const eSIM = `${device}-esim-0`;
      const entries = 5;
      const lazy = readLazy(fork);

      // Five purchases against the one eSIM.
      const populate = await sdk.lazyWalletRegistry.batchPopulateHistory(
        [device],
        [Array.from({ length: entries }, () => eSIM)],
        [bundles(entries)],
      );
      await fork.publicClient.waitForTransactionReceipt({ hash: populate });

      await sdk.lazyWalletRegistry.deployLazyWalletAndSetESIMIdentifier(freshOwnerKey(), device, 7_201n, 0n, 1n);

      // Two entries a call over five, so three transactions again.
      const copy = await sdk.lazyWalletRegistry.setHistoryForLazyWallet(eSIM, 2n);

      expect(copy.alreadyComplete).toBe(false);
      expect(copy.copied).toBe(BigInt(entries));
      expect(copy.batches.map((batch) => batch.copied)).toEqual([2n, 2n, 1n]);
      expect(copy.eSIMWallet).toBe(await lazy.read.lazyDeployedESIMWallet([eSIM]));
      expect(await lazy.read.historyEntriesCopied([eSIM])).toBe(BigInt(entries));

      const again = await sdk.lazyWalletRegistry.setHistoryForLazyWallet(eSIM, 2n);
      expect(again.alreadyComplete).toBe(true);
      expect(again.copied).toBe(0n);
    },
    300_000,
  );

  it("refuses history for an eSIM this registry never deployed", async () => {
    await expect(sdk.lazyWalletRegistry.setHistoryForLazyWallet("fork-lazy-unknown-esim"))
      .rejects.toThrow(/No lazily deployed eSIM wallet/);
  }, 60_000);
});
