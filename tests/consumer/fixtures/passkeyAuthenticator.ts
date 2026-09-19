import { hexToBytes, toHex } from "viem";
import { p256 } from "@noble/curves/nist.js";
import { isoBase64URL } from "@simplewebauthn/server/helpers";

import type { SoftSigner } from "../../utils/softP256Signer.js";

const N = p256.Point.CURVE().n;

// What `Passkey.get` from react-native-passkey returns, produced by a software
// key. The SDK decodes it exactly as it decodes a real device's assertion.
// Real authenticators return a high s about half the time, which `highS` forces.
export const asPasskey = (signer: SoftSigner, { highS = false } = {}) => async (options: { challenge: string }) => {
  const assertion = signer.stamp(toHex(isoBase64URL.toBuffer(options.challenge)));
  const s = highS ? N - assertion.s : assertion.s;

  return {
    response: {
      clientDataJSON: isoBase64URL.fromBuffer(new TextEncoder().encode(assertion.clientDataJSON)),
      authenticatorData: isoBase64URL.fromBuffer(Uint8Array.from(hexToBytes(assertion.authenticatorData))),
      signature: isoBase64URL.fromBuffer(new p256.Signature(assertion.r, s).toBytes("der")),
    },
  };
};
