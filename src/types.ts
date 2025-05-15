import { Hex } from "viem";

export type P256Key = [Hex, Hex];

export type WebAuthnSignature = {
    authenticatorData: Hex,
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
    dataBundleId: string;
    dataBundlePrice: bigint;
}

export type SignedRequest = {
    body: string;
    stamp : {
        stampHeader: string;
        stampHeaderValue: string;
    }
    url: string;
}
