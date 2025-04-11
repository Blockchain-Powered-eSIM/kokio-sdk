import { Hex } from "viem";

export type PublicKey = [Hex, Hex];

export type WebAuthnSignature = {
    authenticatorData: string,
    clientDataJSON: string,
    challengeIndex: bigint,
    typeIndex: bigint,
    r: bigint,
    s: bigint  
}

export type P256Credential = {
    rawId: Hex;
    clientData: {
      type: string;
      challenge: string;
      origin: string;
      crossOrigin: boolean;
    };
    authenticatorData: Hex;
    signature: {r: Hex, s: Hex};
};

export type DataBundleDetails = {
    dataBundleId: string,
    dataBundlePrice: bigint;
}