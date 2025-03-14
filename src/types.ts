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

export type DataBundleDetails = {
    dataBundleId: string,
    dataBundlePrice: bigint;
}