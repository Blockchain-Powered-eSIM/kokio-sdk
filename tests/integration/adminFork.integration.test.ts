import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { getContract, toHex, zeroHash, type Address, type Hex } from "viem";
import { p256 } from "@noble/curves/nist.js";

// `createSmartAccount.ts` (pulled in transitively) statically imports
// `react-native-passkey`, a native module Node's loader cannot parse. The admin
// EOA path never signs a passkey, so stub it out of the graph as the other
// suites do. `vi.mock` is hoisted above the imports below.
vi.mock("react-native-passkey", () => ({ Passkey: {} }));

import { KokioAdmin } from "../../src/admin/config-admin.js";
import { DeviceWalletFactory } from "../../src/abis/index.js";
import { baseSepoliaFactoryAddresses } from "../../src/logic/constants.js";
import type { P256Key } from "../../src/types.js";
import { forkAvailable, impersonateAdmin, startFork, type Fork } from "../utils/forkChain.js";

// Well-formed P256 key fixture (NIST P-256 base point) — createAccount only
// requires a well-formed key, not a registered one.
const OWNER_KEY: P256Key = [
  "0x6B17D1F2E12C4247F8BCE6E563A440F277037D812DEB33A0F4A13945D898C291",
  "0x4FE342E2FE1A7F9B8EE7EB4A7C0F9E162BCE33576B315ECECBB6406837BF51F1",
];

// A fresh, unique P256 public key (uncompressed X/Y). The factory registers each
// key's hash and rejects reuse across a different counterfactual address, so any
// wallet that must coexist with another in the same fork needs its own key.
const freshOwnerKey = (): P256Key => {
  const pub = p256.getPublicKey(p256.utils.randomSecretKey(), false); // 0x04 ‖ X(32) ‖ Y(32)
  return [toHex(pub.slice(1, 33)), toHex(pub.slice(33, 65))];
};

const readCounterfactual = (fork: Fork, uid: string, ownerKey: P256Key, salt: bigint) =>
  getContract({
    abi: DeviceWalletFactory,
    address: baseSepoliaFactoryAddresses.DEVICE_WALLET_FACTORY,
    client: fork.publicClient,
  }).read.getCounterFactualAddress([ownerKey, uid, salt]) as Promise<Address>;

/**
 * EOA-admin write scenarios against a local Base Sepolia fork. The real on-chain
 * `eSIMWalletAdmin` is impersonated (no private key), so `KokioAdmin`'s
 * access-controlled writes actually land on the forked deployment. Skips cleanly
 * unless INTEGRATION=1 and Foundry (`anvil`) is installed.
 */
describe.skipIf(!forkAvailable())("KokioAdmin — EOA writes on a Base Sepolia fork", () => {
  let fork: Fork;
  let admin: Address;
  let adminSdk: KokioAdmin;

  beforeAll(async () => {
    fork = await startFork(8545);
    const impersonated = await impersonateAdmin(fork);
    admin = impersonated.admin;
    adminSdk = new KokioAdmin(impersonated.client);
  }, 60_000);

  afterAll(async () => {
    await fork?.stop();
  });

  it(
    "createAccount deploys a DeviceWallet at the counterfactual address",
    async () => {
      const uid = "fork-admin-createAccount";
      const salt = 0n;

      const expected = await readCounterfactual(fork, uid, OWNER_KEY, salt);
      expect(await fork.publicClient.getCode({ address: expected })).toBeUndefined();

      const hash = (await adminSdk.deviceWalletFactory.createAccount(uid, OWNER_KEY, salt, 0n)) as Hex;
      const receipt = await fork.publicClient.waitForTransactionReceipt({ hash });
      expect(receipt.status).toBe("success");

      const code = await fork.publicClient.getCode({ address: expected });
      expect(code).toBeDefined();
      expect(code).not.toBe("0x");
    },
    60_000,
  );

  it(
    "deployDeviceWalletForUsers (onlyAdminOrRegistry) batch-deploys wallets",
    async () => {
      const uids = ["fork-batch-a", "fork-batch-b"];
      const keys: P256Key[] = [freshOwnerKey(), freshOwnerKey()];
      const salts = [1n, 2n];
      const deposits = [0n, 0n];

      const expected = await Promise.all(uids.map((u, i) => readCounterfactual(fork, u, keys[i], salts[i])));

      const hash = (await adminSdk.deviceWalletFactory.deployDeviceWalletForUsers(
        uids,
        keys,
        salts,
        deposits,
        0n,
      )) as Hex;
      const receipt = await fork.publicClient.waitForTransactionReceipt({ hash });
      expect(receipt.status).toBe("success");

      for (const addr of expected) {
        const code = await fork.publicClient.getCode({ address: addr });
        expect(code, `expected code at ${addr}`).toBeDefined();
        expect(code).not.toBe("0x");
      }
    },
    60_000,
  );

  it(
    "requestAdminUpdate succeeds as the impersonated admin",
    async () => {
      // A non-zero proposed admin distinct from the current one.
      const newAdmin = "0x000000000000000000000000000000000000a11c" as Address;

      const hash = (await adminSdk.deviceWalletFactory.requestAdminUpdate(newAdmin)) as Hex;
      const receipt = await fork.publicClient.waitForTransactionReceipt({ hash });
      expect(receipt.status).toBe("success");
      // The gated call emitted a log (AdminUpdateRequested) rather than reverting.
      expect(receipt.logs.length).toBeGreaterThan(0);
      expect(receipt.logs[0].topics[0]).not.toBe(zeroHash);
    },
    60_000,
  );

  it(
    "requestAdminUpdate is rejected on-chain for a non-admin EOA (access control is real)",
    async () => {
      // Bind KokioAdmin to the funded anvil dev account, which is NOT the admin.
      const nonAdminSdk = new KokioAdmin(fork.funded);
      expect(fork.funded.account?.address).not.toBe(admin);

      // The EOA logic sends via a bare-address account (`eth_sendTransaction`),
      // so anvil mines the tx and returns a hash even though `onlyAdmin` reverts
      // it — the access-control failure surfaces as a reverted receipt, not a
      // thrown promise.
      const hash = (await nonAdminSdk.deviceWalletFactory.requestAdminUpdate(
        "0x000000000000000000000000000000000000beef" as Address,
      )) as Hex;
      const receipt = await fork.publicClient.waitForTransactionReceipt({ hash });
      expect(receipt.status).toBe("reverted");
    },
    60_000,
  );
});
