import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import {
  concat,
  encodeFunctionData,
  getContract,
  hashMessage,
  encodePacked,
  parseEther,
  parseGwei,
  toHex,
  type Address,
  type Hex,
} from "viem";
import { getEntryPoint } from "@aa-sdk/core";
import { baseSepolia } from "viem/chains";

// Pulled in transitively via `_encodeSignature`; the native passkey module is
// never invoked on this path (the software signer replaces it), so stub it out.
vi.mock("react-native-passkey", () => ({ Passkey: {} }));

import { DeviceWallet, DeviceWalletFactory } from "../../src/abis/index.js";
import { baseSepoliaFactoryAddresses } from "../../src/logic/constants.js";
import { SIGNATURE_VALIDITY_SECONDS } from "../../src/logic/constants.js";
import { _encodeSignature } from "../../src/logic/account-kit/createSmartAccount.js";
import { forkAvailable, impersonateAdmin, startFork, type Fork } from "../utils/forkChain.js";
import { createSoftSigner } from "../utils/softP256Signer.js";

const entryPointDef = getEntryPoint(baseSepolia, { version: "0.7.0" });
const ENTRY_POINT = entryPointDef.address as Address;

/** Pack two 16-byte gas values into the EntryPoint v0.7 bytes32 layout (high ‖ low). */
const packGas = (high: bigint, low: bigint): Hex =>
  concat([toHex(high, { size: 16 }), toHex(low, { size: 16 })]);

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

/**
 * End-to-end userOp scenario on a local Base Sepolia fork, with no bundler and no
 * real keys. A software P-256 signer stands in for the on-device passkey: the
 * device wallet is deployed with that key as its owner, a userOp is signed
 * through the SDK's real `_encodeSignature` envelope, and a funded anvil EOA
 * submits it via `EntryPoint.handleOps`. Success proves the deployed
 * `P256Verifier`/`WebAuthn` validation and the `execute` path accept a signature
 * the SDK produced. Skips unless INTEGRATION=1 and Foundry (`anvil`) is present.
 */
describe.skipIf(!forkAvailable())("Device-wallet userOp on a Base Sepolia fork", () => {
  let fork: Fork;
  let admin: Address;

  beforeAll(async () => {
    fork = await startFork(8546);
    admin = (await impersonateAdmin(fork)).admin;
  }, 60_000);

  afterAll(async () => {
    await fork?.stop();
  });

  it(
    "verifies a software-P256 signature on-chain and executes a device-wallet call",
    async () => {
      const signer = createSoftSigner();
      const uid = "fork-userop-p256";
      const salt = 0n;

      const factory = getContract({
        abi: DeviceWalletFactory,
        address: baseSepoliaFactoryAddresses.DEVICE_WALLET_FACTORY,
        client: { public: fork.publicClient, wallet: fork.funded },
      });
      const entryPoint = getContract({
        abi: entryPointDef.abi,
        address: ENTRY_POINT,
        client: { public: fork.publicClient, wallet: fork.funded },
      });

      // Deploy the device wallet owned by the software key. `createAccount` is
      // public/payable, so the funded anvil EOA can call it directly.
      const sender = (await factory.read.getCounterFactualAddress([signer.ownerKey, uid, salt])) as Address;
      const deployHash = await factory.write.createAccount([uid, signer.ownerKey, salt], { value: 0n });
      await fork.publicClient.waitForTransactionReceipt({ hash: deployHash });
      expect(await fork.publicClient.getCode({ address: sender })).not.toBe("0x");

      // Fund the account's gas (EntryPoint deposit) and its ETH balance (for the
      // value it will forward through `execute`).
      const depositHash = await entryPoint.write.depositTo([sender], { value: parseEther("1") });
      await fork.publicClient.waitForTransactionReceipt({ hash: depositHash });
      await fork.testClient.setBalance({ address: sender, value: parseEther("1") });

      // The action the userOp performs: forward 0.01 ETH to a fresh recipient.
      const recipient = "0x00000000000000000000000000000000000d00d1" as Address;
      const transferValue = parseEther("0.01");
      const callData = encodeFunctionData({
        abi: DeviceWallet,
        functionName: "execute",
        args: [{ dest: recipient, value: transferValue, data: "0x" }],
      });

      const nonce = (await entryPoint.read.getNonce([sender, 0n])) as bigint;

      const userOp: PackedUserOperation = {
        sender,
        nonce,
        initCode: "0x",
        callData,
        accountGasLimits: packGas(1_000_000n, 1_000_000n),
        preVerificationGas: 1_000_000n,
        gasFees: packGas(parseGwei("2"), parseGwei("50")),
        paymasterAndData: "0x",
        signature: "0x",
      };

      // Hash via the deployed EntryPoint so the digest matches exactly.
      const userOpHash = (await entryPoint.read.getUserOpHash([userOp])) as Hex;

      // Reproduce `_signUserOperationHash`'s envelope, swapping only the native
      // `_stamp` for the software signer; the SDK's real `_encodeSignature` runs.
      const validUntil = Math.floor(Date.now() / 1000) + SIGNATURE_VALIDITY_SECONDS;
      const precursor = encodePacked(["uint8", "uint48", "bytes32"], [1, validUntil, userOpHash]);
      const payload = hashMessage({ raw: precursor });
      userOp.signature = await _encodeSignature(signer.stamp(payload), validUntil);

      const recipientBefore = await fork.publicClient.getBalance({ address: recipient });

      const handleHash = await entryPoint.write.handleOps([[userOp], admin]);
      const receipt = await fork.publicClient.waitForTransactionReceipt({ hash: handleHash });
      expect(receipt.status).toBe("success");

      // The EntryPoint reports userOp success (signature verified + call ran)...
      const events = await entryPoint.getEvents.UserOperationEvent({}, {
        blockHash: receipt.blockHash,
      });
      expect(events.length).toBe(1);
      expect(events[0].args.success).toBe(true);

      // ...and the on-chain effect landed: the recipient received the forwarded ETH.
      const recipientAfter = await fork.publicClient.getBalance({ address: recipient });
      expect(recipientAfter - recipientBefore).toBe(transferValue);
    },
    120_000,
  );
});
