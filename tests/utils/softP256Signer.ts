import { sha256, toHex, type Hex } from "viem";
import { p256 } from "@noble/curves/nist.js";
import { isoBase64URL } from "@simplewebauthn/server/helpers";

import type { P256Key, WebAuthnSignature } from "../../src/types.js";

/**
 * Test-only software replacement for the native passkey `_stamp`.
 *
 * The mobile SDK signs a userOp by calling an on-device passkey, which returns a
 * WebAuthn assertion (`authenticatorData`, `clientDataJSON`, `r`, `s`). That
 * native call can't run in Node, so this signer holds a software P-256 keypair
 * and produces an assertion with the *exact* shape the SDK's `_encodeSignature`
 * and the deployed `WebAuthn.sol` verifier expect. Everything downstream — the
 * `_encodeSignature` envelope, low-s handling, on-chain `P256Verifier` — is the
 * real path; only the key custody is software instead of a secure enclave.
 *
 * NEVER import this from `src/`. It exists purely to drive fork-based userOp
 * scenarios without a real authenticator.
 */

/** Origin baked into `clientDataJSON`. `WebAuthn.sol` deliberately does not check origin. */
const ORIGIN = "https://kokio.test";

/** WebAuthn flags byte: User Present (0x01) | User Verified (0x04); the contract requires both. */
const FLAGS_UP_UV = 0x05;

export interface SoftSigner {
  /** Owner public key (uncompressed X/Y) to register as the device wallet's `owner`. */
  ownerKey: P256Key;
  /**
   * Produce a `WebAuthnSignature` over `payload` (the raw challenge bytes — i.e.
   * the EIP-191 digest the account reconstructs on-chain), mirroring `_stamp`.
   */
  stamp: (payload: Hex) => WebAuthnSignature;
}

/** rpId hashed into `authenticatorData`; `WebAuthn.sol` does not verify it, so any value works. */
const authenticatorData = (rpId: string): Uint8Array => {
  const rpIdHash = sha256(new TextEncoder().encode(rpId), "bytes");
  const out = new Uint8Array(37);
  out.set(rpIdHash, 0); // 32-byte rpIdHash
  out[32] = FLAGS_UP_UV; // flags
  // out[33..37] = 4-byte signature counter, left at zero
  return out;
};

/** Create a software signer with a fresh random P-256 keypair. */
export const createSoftSigner = (rpId = "kokio.test"): SoftSigner => {
  const privateKey = p256.utils.randomSecretKey();
  const publicKey = p256.getPublicKey(privateKey, false); // 0x04 ‖ X(32) ‖ Y(32)
  const ownerKey: P256Key = [toHex(publicKey.slice(1, 33)), toHex(publicKey.slice(33, 65))];

  const authData = authenticatorData(rpId);

  const stamp = (payload: Hex): WebAuthnSignature => {
    // The challenge is the raw payload bytes, Base64URL-encoded exactly as the
    // passkey path does (`isoBase64URL.fromBuffer`). The contract re-encodes the
    // raw bytes with Solady's Base64URL and compares, so these must match.
    const challenge = isoBase64URL.fromBuffer(new Uint8Array(Buffer.from(payload.slice(2), "hex")));

    const clientDataJSON =
      `{"type":"webauthn.get","challenge":"${challenge}","origin":"${ORIGIN}","crossOrigin":false}`;

    // Byte offsets the contract slices at, computed the same way `_stamp` does.
    const typeIndex = BigInt(clientDataJSON.indexOf('"type":"webauthn.get"'));
    const challengeIndex = BigInt(clientDataJSON.indexOf('"challenge":'));

    // WebAuthn/ES256 signs the message `authenticatorData ‖ sha256(clientDataJSON)`;
    // ECDSA-with-SHA256 hashes that message, so the digest the verifier checks is
    // sha256(authenticatorData ‖ sha256(clientDataJSON)). `p256.sign` applies the
    // curve hash itself, so sign the *message* here — do not pre-hash it, or the
    // signature would be over a double hash and fail on-chain.
    const clientDataHash = sha256(new TextEncoder().encode(clientDataJSON), "bytes");
    const signedMessage = new Uint8Array(authData.length + clientDataHash.length);
    signedMessage.set(authData, 0);
    signedMessage.set(clientDataHash, authData.length);

    const sig = p256.sign(signedMessage, privateKey, { lowS: true });
    const { r, s } = p256.Signature.fromBytes(sig, "compact");

    return {
      authenticatorData: toHex(authData),
      clientDataJSON,
      challengeIndex,
      typeIndex,
      r,
      s,
    };
  };

  return { ownerKey, stamp };
};
