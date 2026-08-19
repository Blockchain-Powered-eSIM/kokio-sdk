import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import {
  encodeFunctionData,
  getContract,
  hashMessage,
  encodePacked,
  parseEther,
  parseGwei,
  concat,
  toHex,
  type Address,
  type Hex,
} from "viem";
import { entryPoint08Abi } from "viem/account-abstraction";

// Pulled in transitively via `_encodeSignature`; the native passkey module is
// never invoked on this path (the software signer replaces it), so stub it out.
vi.mock("react-native-passkey", () => ({ Passkey: {} }));

import { DeviceWallet, DeviceWalletFactory } from "../../src/abis/index.js";
import { baseSepoliaFactoryAddresses, SIGNATURE_VALIDITY_SECONDS } from "../../src/logic/constants.js";
import { _encodeSignature } from "../../src/logic/account-kit/createSmartAccount.js";
import { forkAvailable, startFork, type Fork } from "../utils/forkChain.js";
import { createSoftSigner } from "../utils/softP256Signer.js";

const ENTRY_POINT = baseSepoliaFactoryAddresses.ENTRY_POINT as Address;

const packGas = (high: bigint, low: bigint): Hex =>
  concat([toHex(high, { size: 16 }), toHex(low, { size: 16 })]);

// A valid RIP-7212 input: messageHash ‖ r ‖ s ‖ x ‖ y, 160 bytes. Verified against
// live Base Sepolia, which returns 1. Used only to prove the fork serves the
// precompile, never as a signature.
const RIP7212_VALID_VECTOR =
  "0x4bb06f8e4e3a7715d201d573d0aa423762e55dabd61a2c02278fa56cc6d294e0" +
  "68ebf6dcf8bdad640697751a412a610add226785e002d8bae8965e14245dd040" +
  "2eb668f720c07a9276ff93218b5b538528fc3b890d03c447001cd081c52a7dbc" +
  "d26926b66c1a8e200effaf2456f8d08741059314b0dd95799e50e588a74a8715" +
  "d1250002e3e6d22edc38e6f129578abd110c31ed8b14fe2f8ae56239a2f2c0b7" as Hex;

// What verification actually needs on this deployment. The stub estimates 33,703
// against a measured floor of 76,628, so anything sized from the stub is refused.
const VERIFICATION_GAS_FLOOR = 100_000n;

interface PackedUserOperation {
  sender: Address;
  nonce: bigint;
  initCode: Hex;
  callData: Hex;
  accountGasLimits: Hex;
  preVerificationGas: bigint;
  gasFees: Hex;
  paymasterAndData: Hex;
  signature: Hex;
}

// What the stub signature costs to validate against what a real one costs.
//
// `getStubSignature` hands the bundler `"0x"` so gas estimation has something to
// run before a passkey exists. The account short-circuits any signature of 39
// bytes or fewer straight to SIG_VALIDATION_FAILED, so the stub never reaches the
// P256 verifier that a real signature does. Whatever the bundler measures on the
// stub is therefore the cost of the early return, and the operation it later has
// to run is the expensive path. This measures the gap so the SDK can cover it.
describe.skipIf(!forkAvailable())("Stub signature validation cost", () => {
  let fork: Fork;

  beforeAll(async () => {
    fork = await startFork(8550);
  }, 60_000);

  afterAll(async () => {
    await fork?.stop();
  });

  it(
    "measures the stub against a real signature on the same operation",
    async () => {
      const signer = createSoftSigner();
      const uid = "fork-stub-sig-cost";
      const salt = 0n;

      const factory = getContract({
        abi: DeviceWalletFactory,
        address: baseSepoliaFactoryAddresses.DEVICE_WALLET_FACTORY,
        client: { public: fork.publicClient, wallet: fork.funded },
      });
      const entryPoint = getContract({
        abi: entryPoint08Abi,
        address: ENTRY_POINT,
        client: { public: fork.publicClient, wallet: fork.funded },
      });

      const sender = (await factory.read.getCounterFactualAddress([signer.ownerKey, uid, salt])) as Address;
      const deployHash = await factory.write.createAccount([uid, signer.ownerKey, salt], { value: 0n });
      await fork.publicClient.waitForTransactionReceipt({ hash: deployHash });

      const depositHash = await entryPoint.write.depositTo([sender], { value: parseEther("1") });
      await fork.publicClient.waitForTransactionReceipt({ hash: depositHash });
      await fork.testClient.setBalance({ address: sender, value: parseEther("1") });

      const callData = encodeFunctionData({
        abi: DeviceWallet,
        functionName: "execute",
        args: [{ dest: sender, value: 0n, data: "0x" }],
      });

      const userOp: PackedUserOperation = {
        sender,
        nonce: (await entryPoint.read.getNonce([sender, 0n])) as bigint,
        initCode: "0x",
        callData,
        accountGasLimits: packGas(1_000_000n, 1_000_000n),
        preVerificationGas: 1_000_000n,
        gasFees: packGas(parseGwei("2"), parseGwei("50")),
        paymasterAndData: "0x",
        signature: "0x",
      };

      const userOpHash = (await entryPoint.read.getUserOpHash([userOp])) as Hex;

      const validUntil = Math.floor(Date.now() / 1000) + SIGNATURE_VALIDITY_SECONDS;
      const precursor = encodePacked(["uint8", "uint48", "bytes32"], [1, validUntil, userOpHash]);
      const realSignature = await _encodeSignature(signer.stamp(hashMessage({ raw: precursor })), validUntil);

      // `validateUserOp` is onlyEntryPoint, so the measurement calls it as the
      // EntryPoint. anvil signs for an impersonated account, and estimateGas needs
      // no signature anyway.
      const costOf = async (signature: Hex): Promise<bigint> =>
        fork.publicClient.estimateGas({
          account: ENTRY_POINT,
          to: sender,
          data: encodeFunctionData({
            abi: DeviceWallet,
            functionName: "validateUserOp",
            args: [{ ...userOp, signature }, userOpHash, 0n],
          }),
        });

      // Base Sepolia answers at 0x100, so a fork that does not would measure the
      // FreshCryptoLib fallback and every number below would be ~4x too high. A
      // precompile holds no bytecode, so `getCode` cannot tell the two apart:
      // only a call with a known-good vector can. This one is pinned, and was
      // checked against live Base Sepolia.
      const p256Probe = await fork.publicClient.call({
        to: "0x0000000000000000000000000000000000000100",
        data: RIP7212_VALID_VECTOR,
      });
      expect(p256Probe.data).toBe("0x".padEnd(65, "0") + "1");

      const stubCost = await costOf("0x");
      const realCost = await costOf(realSignature);

      console.log(`stub  "0x"            : ${stubCost} gas, ${0} signature bytes`);
      console.log(`real  WebAuthn sig    : ${realCost} gas, ${(realSignature.length - 2) / 2} signature bytes`);
      console.log(`shortfall             : ${realCost - stubCost} gas`);

      // The whole point of the question: the stub does not measure what the real
      // operation costs, because it never reaches the P256 verifier.
      expect(realCost).toBeGreaterThan(stubCost);

      // And the gap is not academic. `accountGasLimits` is inside the userOp hash,
      // so each limit has to be signed for separately: build the operation at the
      // limit, hash it, then sign that hash.
      const signedAt = async (verificationGasLimit: bigint) => {
        const op = { ...userOp, accountGasLimits: packGas(verificationGasLimit, 1_000_000n) };
        const hash = (await entryPoint.read.getUserOpHash([op])) as Hex;
        const until = Math.floor(Date.now() / 1000) + SIGNATURE_VALIDITY_SECONDS;
        const digest = hashMessage({
          raw: encodePacked(["uint8", "uint48", "bytes32"], [1, until, hash]),
        });
        return { ...op, signature: await _encodeSignature(signer.stamp(digest), until) };
      };

      const submit = (op: PackedUserOperation) =>
        entryPoint.simulate.handleOps([[op], fork.funded.account!.address], {
          account: fork.funded.account!.address,
        });

      // An operation sized from the stub cannot afford to check the signature it
      // carries, and the EntryPoint refuses it.
      await expect(submit(await signedAt(stubCost))).rejects.toThrow();

      // An operation sized from the stub cannot afford to check the signature it
      // carries. The EntryPoint refuses it outright with AA26 rather than running
      // it and reporting failure, so this is a dropped operation, not a failed one.
      await expect(submit(await signedAt(stubCost))).rejects.toThrow();

      // Sized for what verification actually costs, the same operation goes through.
      // Measured minimum on this deployment is 76,628; the headroom here is for
      // compiler and chain drift, not for the shortfall being approximate.
      await expect(submit(await signedAt(VERIFICATION_GAS_FLOOR))).resolves.toBeDefined();

      // Guards the finding itself: if the stub ever starts measuring the real
      // path, this ratio collapses and the SDK no longer needs to pad.
      expect(Number(VERIFICATION_GAS_FLOOR) / Number(stubCost)).toBeGreaterThan(2);
    },
    180_000,
  );
});
