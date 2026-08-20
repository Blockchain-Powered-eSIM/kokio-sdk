import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import {
  concat,
  getContract,
  hashMessage,
  hashTypedData,
  hexToBytes,
  sliceHex,
  toHex,
  type Address,
  type Hex,
  type TypedDataDefinition,
} from "viem";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { p256 } from "@noble/curves/nist.js";

// The software signer stands in for the on-device passkey, so `Passkey.get` is
// the one thing replaced. Everything below it, including the challenge the SDK
// derives, is the real path.
const passkeyGet = vi.fn();
vi.mock("react-native-passkey", () => ({
  Passkey: { get: (...args: unknown[]) => passkeyGet(...args) },
}));

import { DeviceWallet, DeviceWalletFactory } from "../../src/abis/index.js";
import { baseSepoliaFactoryAddresses, CHAIN_ID, SIGNATURE_VALIDITY_SECONDS } from "../../src/logic/constants.js";
import {
  _encodeSignature,
  _signMessage,
  _signTypedData,
} from "../../src/logic/account-kit/createSmartAccount.js";
import { forkAvailable, startFork, type Fork } from "../utils/forkChain.js";
import { createSoftSigner, type SoftSigner } from "../utils/softP256Signer.js";

const MAGIC_VALUE = "0x1626ba7e";
const REFUSED = "0xffffffff";

// Wraps the software signer in the shape `_stamp` decodes, so a call reaching
// `Passkey.get` signs whatever challenge the SDK put in front of it.
const asPasskey = (signer: SoftSigner) => async (options: { challenge: string }) => {
  const assertion = signer.stamp(toHex(isoBase64URL.toBuffer(options.challenge)));

  return {
    response: {
      clientDataJSON: isoBase64URL.fromBuffer(new TextEncoder().encode(assertion.clientDataJSON)),
      authenticatorData: isoBase64URL.fromBuffer(Uint8Array.from(hexToBytes(assertion.authenticatorData))),
      signature: isoBase64URL.fromBuffer(new p256.Signature(assertion.r, assertion.s).toBytes("der")),
    },
  };
};

const typedData: TypedDataDefinition = {
  domain: { name: "Kokio", version: "1", chainId: 11155111 },
  types: { Mail: [{ name: "from", type: "address" }, { name: "contents", type: "string" }] },
  primaryType: "Mail",
  message: { from: "0x0000000000000000000000000000000000000001", contents: "gm" },
};

// ERC-1271 message signing against a real device wallet on a local Base Sepolia
// fork. The unit tests pin the challenge the SDK builds; this proves the wallet
// rebuilds the same one, which is the only check that fails if either side
// moves. Skips cleanly unless INTEGRATION=1 and Foundry is installed.
describe.skipIf(!forkAvailable())("ERC-1271 message signing on a Base Sepolia fork", () => {
  let fork: Fork;
  let signer: SoftSigner;
  let wallet: Address;
  let readWallet: ReturnType<typeof getContract>;

  beforeAll(async () => {
    fork = await startFork(8549);
    signer = createSoftSigner();
    passkeyGet.mockImplementation(asPasskey(signer));

    const factory = getContract({
      abi: DeviceWalletFactory,
      address: baseSepoliaFactoryAddresses.DEVICE_WALLET_FACTORY,
      client: { public: fork.publicClient, wallet: fork.funded },
    });

    const uid = "fork-erc1271-device";
    wallet = (await factory.read.getCounterFactualAddress([signer.ownerKey, uid, 0n])) as Address;
    const hash = await factory.write.createAccount([uid, signer.ownerKey, 0n], { value: 0n });
    await fork.publicClient.waitForTransactionReceipt({ hash });

    readWallet = getContract({ abi: DeviceWallet, address: wallet, client: fork.publicClient });
  }, 120_000);

  afterAll(async () => {
    await fork?.stop();
  });

  const check = (digest: Hex, signature: Hex) =>
    readWallet.read.isValidSignature([digest, signature]) as Promise<Hex>;

  it("the wallet accepts a signature the SDK produced for it", async () => {
    const message = "gm from kokio";
    const signature = await _signMessage(message, "cred-id", "kokio.test", CHAIN_ID.BASE_SEPOLIA, wallet);

    expect(await check(hashMessage(message), signature)).toBe(MAGIC_VALUE);
  }, 60_000);

  it("the wallet accepts typed data the SDK signed for it", async () => {
    const signature = await _signTypedData(typedData, "cred-id", "kokio.test", CHAIN_ID.BASE_SEPOLIA, wallet);

    expect(await check(hashTypedData(typedData), signature)).toBe(MAGIC_VALUE);
  }, 60_000);

  it("a signature over the bare digest is refused", async () => {
    // What the SDK sent before it bound the wallet and the chain. The wallet
    // derives its challenge from the digest rather than reading it, so a
    // signature over the digest itself was never going to verify.
    const message = "gm from kokio";
    const validUntil = Math.floor(Date.now() / 1000) + SIGNATURE_VALIDITY_SECONDS;
    const signature = await _encodeSignature(signer.stamp(hashMessage(message)), validUntil);

    expect(await check(hashMessage(message), signature)).toBe(REFUSED);
  }, 60_000);

  it("a signature bound to another chain is refused", async () => {
    const message = "gm from kokio";
    const signature = await _signMessage(message, "cred-id", "kokio.test", CHAIN_ID.OPTIMISM_SEPOLIA, wallet);

    expect(await check(hashMessage(message), signature)).toBe(REFUSED);
  }, 60_000);

  it("a signature bound to another wallet is refused", async () => {
    // Wallets sit at the same address on every chain and one owner key can back
    // a second wallet at another salt, so the address has to be in the challenge.
    const message = "gm from kokio";
    const other = "0x000000000000000000000000000000000000beef" as Address;
    const signature = await _signMessage(message, "cred-id", "kokio.test", CHAIN_ID.BASE_SEPOLIA, other);

    expect(await check(hashMessage(message), signature)).toBe(REFUSED);
  }, 60_000);

  it("a signature for one message does not verify against another", async () => {
    const signature = await _signMessage("gm from kokio", "cred-id", "kokio.test", CHAIN_ID.BASE_SEPOLIA, wallet);

    expect(await check(hashMessage("gn from kokio"), signature)).toBe(REFUSED);
  }, 60_000);

  it("rewriting validUntil in the envelope invalidates the signature", async () => {
    const message = "gm from kokio";
    const signature = await _signMessage(message, "cred-id", "kokio.test", CHAIN_ID.BASE_SEPOLIA, wallet);

    // Six bytes anyone can edit in transit. They are inside the challenge, so
    // extending the expiry breaks the assertion rather than reviving it.
    const extended = concat([
      sliceHex(signature, 0, 1),
      toHex(Math.floor(Date.now() / 1000) + 86_400, { size: 6 }),
      sliceHex(signature, 7),
    ]);

    expect(await check(hashMessage(message), extended)).toBe(REFUSED);
  }, 60_000);

  it("an expired signature is refused", async () => {
    const message = "gm from kokio";
    const signature = await _signMessage(message, "cred-id", "kokio.test", CHAIN_ID.BASE_SEPOLIA, wallet);
    expect(await check(hashMessage(message), signature)).toBe(MAGIC_VALUE);

    await fork.testClient.increaseTime({ seconds: SIGNATURE_VALIDITY_SECONDS + 60 });
    await fork.testClient.mine({ blocks: 1 });

    expect(await check(hashMessage(message), signature)).toBe(REFUSED);
  }, 60_000);
});
