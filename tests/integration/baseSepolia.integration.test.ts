import "dotenv/config";
import { describe, it, expect, beforeAll, vi } from "vitest";
import { getAddress, isAddress, zeroAddress, type Hex, type PublicClient, type WalletClient } from "viem";

// `createSmartAccount.ts` statically imports `react-native-passkey`, a native RN
// module that ships source Node's loader cannot parse (it throws a SyntaxError
// on load). This read-only tier never signs — `Passkey.get` is only reached on
// the write/UserOp path — so we stub the module to keep it out of the graph,
// mirroring the unit suite. `vi.mock` is hoisted above the imports below.
vi.mock("react-native-passkey", () => ({ Passkey: {} }));

import {
  hasRpc,
  getRpcUrl,
  makeBaseSepoliaPublicClient,
  makeBaseSepoliaReadClient,
} from "../utils/liveClient.js";
import {
  _extractChainID,
  _getChainSpecificConstants,
  baseSepoliaFactoryAddresses,
  CHAIN_ID,
} from "../../src/logic/constants.js";
import {
  getCounterFactualAddress,
  _assertCounterfactualMatchesOnChain,
} from "../../src/logic/account-kit/createSmartAccount.js";
import { DeviceWalletFactory, ESIMWalletFactory } from "../../src/abis/index.js";
import type { P256Key } from "../../src/types.js";

const BASE_SEPOLIA_CHAIN_ID = 84532;

// Deterministic fixture. Any well-formed P256 public key works for a read-only
// counterfactual derivation — the factory does not require the key to be
// registered. This is the NIST P-256 base point, also used by the unit tests.
const OWNER_KEY: P256Key = [
  "0x6B17D1F2E12C4247F8BCE6E563A440F277037D812DEB33A0F4A13945D898C291",
  "0x4FE342E2FE1A7F9B8EE7EB4A7C0F9E162BCE33576B315ECECBB6406837BF51F1",
];
const DEVICE_UID = "kokio-sdk-integration-fixture";
const SALT = 0n;

/**
 * Opt-in, read-only parity checks against LIVE Base Sepolia. Skips cleanly when
 * BASE_SEPOLIA_RPC_URL is unset (CI / offline), so it never turns the default
 * `npm test` red. Run with `npm run test:integration`.
 *
 * Purpose: unit tests run entirely on mocked clients, so the SDK's hand-mirrored
 * on-chain encodings (CREATE2 counterfactual, ABIs, factory addresses) can drift
 * from what is actually deployed while staying green locally. These checks catch
 * "green locally, broken on-chain" before shipping.
 */
describe.skipIf(!hasRpc())("Base Sepolia — live read-only parity", () => {
  // Built lazily in beforeAll — the describe callback still runs when the suite
  // is skipped, and eager construction would call getRpcUrl() (which throws
  // without BASE_SEPOLIA_RPC_URL) and break the clean skip.
  let publicClient: PublicClient;
  let readClient: WalletClient;

  // Fail fast with a clear message if the RPC points at the wrong chain.
  beforeAll(async () => {
    publicClient = makeBaseSepoliaPublicClient();
    readClient = makeBaseSepoliaReadClient();

    const chainId = await publicClient.getChainId();
    expect(chainId, "BASE_SEPOLIA_RPC_URL must point at Base Sepolia (84532)").toBe(
      BASE_SEPOLIA_CHAIN_ID,
    );
  });

  // 1. Chain sanity — the SDK's chain resolution treats Base Sepolia as a
  //    configured chain and returns the Base Sepolia factory set (proves the
  //    unconfigured-chain guard does not reject it).
  it("resolves Base Sepolia as a configured chain", async () => {
    const chainID = await _extractChainID(readClient);
    expect(chainID).toBe(BASE_SEPOLIA_CHAIN_ID);

    const values = _getChainSpecificConstants(chainID as CHAIN_ID.BASE_SEPOLIA, getRpcUrl());
    expect(values.factoryAddresses.DEVICE_WALLET_FACTORY).toBe(
      baseSepoliaFactoryAddresses.DEVICE_WALLET_FACTORY,
    );
    expect(values.factoryAddresses.ESIM_WALLET_FACTORY).toBe(
      baseSepoliaFactoryAddresses.ESIM_WALLET_FACTORY,
    );
  });

  // 2. Deployment liveness — every configured Base Sepolia address hosts code.
  it("has bytecode at every configured factory address", async () => {
    const names = [
      "DEVICE_WALLET_FACTORY",
      "ESIM_WALLET_FACTORY",
      "LAZY_WALLET_REGISTRY",
      "REGISTRY",
      "P256VERIFIER",
    ] as const;

    for (const name of names) {
      const address = baseSepoliaFactoryAddresses[name];
      const code = await publicClient.getCode({ address });
      expect(code, `${name} (${address}) should host deployed code`).toBeDefined();
      expect(code).not.toBe("0x");
    }
  });

  // 3. Factory-identity lock — records the planning finding that on Base Sepolia
  //    the Device/ESIM roles are the reverse of Sepolia. DEVICE_WALLET_FACTORY
  //    answers getCurrentDeviceWalletImplementation(); ESIM_WALLET_FACTORY
  //    answers getCurrentESIMWalletImplementation(). If anyone "corrects" the
  //    Base Sepolia addresses to match Sepolia's ordering, the wrong contract is
  //    queried and the impl getter reverts/decodes wrong — this goes red.
  //    Asserts a valid non-zero impl (not a pinned value) so a legitimate beacon
  //    upgrade does NOT cause a false failure.
  it("locks factory identity (Device/ESIM roles) on Base Sepolia", async () => {
    const deviceImpl = (await publicClient.readContract({
      address: baseSepoliaFactoryAddresses.DEVICE_WALLET_FACTORY,
      abi: DeviceWalletFactory,
      functionName: "getCurrentDeviceWalletImplementation",
    })) as Hex;
    expect(isAddress(deviceImpl)).toBe(true);
    expect(getAddress(deviceImpl)).not.toBe(zeroAddress);

    const esimImpl = (await publicClient.readContract({
      address: baseSepoliaFactoryAddresses.ESIM_WALLET_FACTORY,
      abi: ESIMWalletFactory,
      functionName: "getCurrentESIMWalletImplementation",
    })) as Hex;
    expect(isAddress(esimImpl)).toBe(true);
    expect(getAddress(esimImpl)).not.toBe(zeroAddress);
  });

  // 4. Counterfactual parity (highest value) — the SDK's off-chain CREATE2
  //    derivation must equal the live factory's on-chain view for a fixed
  //    fixture. Validates BEACON_PROXY_CREATION_CODE + on-chain beacon read +
  //    init-code encoding against the real deployment — the exact drift class
  //    the mocked unit tests cannot catch. `_assertCounterfactualMatchesOnChain`
  //    throws CounterfactualMismatchError on drift; a returned address = match.
  it("derives a counterfactual address matching the on-chain factory view", async () => {
    const offChain = await getCounterFactualAddress(readClient, DEVICE_UID, OWNER_KEY, SALT);
    expect(isAddress(offChain)).toBe(true);

    const reconciled = await _assertCounterfactualMatchesOnChain(
      readClient,
      DEVICE_UID,
      OWNER_KEY,
      SALT,
    );
    expect(getAddress(reconciled)).toBe(getAddress(offChain));
  });

  // 5. ABI compatibility is exercised implicitly by 3 & 4: every readContract /
  //    getContract read above runs `decodeFunctionResult` against the deployed
  //    bytecode, so ABI drift surfaces as a decode failure in those tests.
});
