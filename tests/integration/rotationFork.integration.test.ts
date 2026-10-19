import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { encodeAbiParameters, encodePacked, getContract, keccak256, type Address, type Hex } from "viem";

import { DeviceWallet, DeviceWalletFactory } from "../../src/abis/index.js";
import { KokioAdmin } from "../../src/admin/config-admin.js";
import { _getOwner, _rotationChallenge, _transferOwnership } from "../../src/logic/deviceWallet.js";
import { toContractRevertError } from "../../src/logic/errors.js";
import type { KokioSmartAccountClient } from "../../src/types.js";
import { forkAvailable, impersonateAdmin, impersonatedSmartAccount, startFork, type Fork } from "../utils/forkChain.js";
import { createSoftSigner, type SoftSigner } from "../utils/softP256Signer.js";

// The rotation proof is the bare WebAuthnSignature struct. Unlike a user operation
// signature it carries no version or validUntil header.
const proofOver = (signer: SoftSigner, challenge: Hex): Hex =>
  encodeAbiParameters(
    [{
      type: "tuple",
      components: [
        { name: "authenticatorData", type: "bytes" },
        { name: "clientDataJSON", type: "string" },
        { name: "challengeIndex", type: "uint256" },
        { name: "typeIndex", type: "uint256" },
        { name: "r", type: "uint256" },
        { name: "s", type: "uint256" },
      ],
    }],
    [signer.stamp(challenge)],
  );

// The challenge as the handover doc defines it, built offchain.
const challengeFor = (chainId: number, wallet: Address, key: SoftSigner["ownerKey"]): Hex =>
  keccak256(encodePacked(
    ["string", "uint256", "address", "bytes32", "bytes32"],
    ["\x19Ethereum Signed Message:\n116", BigInt(chainId), wallet, key[0], key[1]],
  ));

// Owner key rotation on a Base mainnet fork, against the deployed contracts.
// Skips cleanly unless INTEGRATION=1 and Foundry is installed.
describe.skipIf(!forkAvailable())("device wallet key rotation on a Base mainnet fork", () => {
  let fork: Fork;
  let wallet: Address;
  let client: KokioSmartAccountClient;

  beforeAll(async () => {
    fork = await startFork(undefined, undefined, "base");
    const owner = createSoftSigner();

    const factory = getContract({
      abi: DeviceWalletFactory,
      address: fork.addresses.DEVICE_WALLET_FACTORY,
      client: { public: fork.publicClient, wallet: fork.funded },
    });

    const uid = "fork-rotation-device";
    wallet = (await factory.read.getCounterFactualAddress([owner.ownerKey, uid, 0n])) as Address;
    const deploy = await factory.write.createAccount([uid, owner.ownerKey, 0n], { value: 0n });
    await fork.publicClient.waitForTransactionReceipt({ hash: deploy });

    // The registry has to know the wallet before it accepts a new key for it.
    const { client: adminClient } = await impersonateAdmin(fork);
    const record = await new KokioAdmin(adminClient).deviceWalletFactory.postCreateAccount(wallet, uid, owner.ownerKey, 0n);
    await fork.publicClient.waitForTransactionReceipt({ hash: record });

    client = await impersonatedSmartAccount(fork, wallet);
  }, 120_000);

  afterAll(async () => {
    await fork?.stop();
  });

  const revertName = (newOwner: SoftSigner["ownerKey"], proof: Hex) =>
    fork.publicClient
      .simulateContract({ account: wallet, address: wallet, abi: DeviceWallet, functionName: "transferOwnership", args: [newOwner, proof] })
      .then(() => undefined, (e) => toContractRevertError(e)?.decoded?.errorName);

  it("reads the challenge the handover doc describes", async () => {
    const next = createSoftSigner();

    expect(await _rotationChallenge(client, wallet, next.ownerKey)).toBe(challengeFor(fork.chain.id, wallet, next.ownerKey));
  }, 60_000);

  it("refuses a proof signed by a different key", async () => {
    const next = createSoftSigner();
    const impostor = createSoftSigner();
    const challenge = await _rotationChallenge(client, wallet, next.ownerKey);

    expect(await revertName(next.ownerKey, proofOver(impostor, challenge))).toBe("NewOwnerKeyCannotSign");
  }, 60_000);

  it("refuses a proof made for another wallet", async () => {
    const next = createSoftSigner();
    const other = "0x000000000000000000000000000000000000bEEF" as Address;

    expect(await revertName(next.ownerKey, proofOver(next, challengeFor(fork.chain.id, other, next.ownerKey))))
      .toBe("NewOwnerKeyCannotSign");
  }, 60_000);

  it("refuses an empty proof", async () => {
    const next = createSoftSigner();

    expect(await revertName(next.ownerKey, "0x")).toBe("NewOwnerKeyCannotSign");
  }, 60_000);

  it("rotates to a key that signed its challenge", async () => {
    const next = createSoftSigner();
    const challenge = await _rotationChallenge(client, wallet, next.ownerKey);

    await _transferOwnership(client, wallet, next.ownerKey, proofOver(next, challenge));

    expect(await _getOwner(fork.publicClient as never, wallet)).toEqual(next.ownerKey);
  }, 60_000);
});
