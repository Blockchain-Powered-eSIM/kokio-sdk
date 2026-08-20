import { Hex } from "viem";
import {
    _verifySignature
} from "../logic/P256Verifier.js"
import { WebAuthnSignature, KokioSmartAccountClient } from "../types.js";

export class P256VerifierSubPackage {

    client: KokioSmartAccountClient;

    constructor(client: KokioSmartAccountClient) {
        this.client = client;
    }

    verifySignature (message: Hex, requireMessageVerification: boolean, webAuthnSignature: WebAuthnSignature, x: bigint, y: bigint) {
        return _verifySignature(this.client, message, requireMessageVerification, webAuthnSignature, x, y);
    }
}
