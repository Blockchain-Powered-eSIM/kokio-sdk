import { Address, Hex, WalletClient } from "viem";
import {
    _verifySignature
} from "../logic/P256Verifier.js"
import { WebAuthnSignature } from "../types";
import { SmartAccountClient } from "@aa-sdk/core";

export class P256VerifierSubPackage {

    client: SmartAccountClient;

    constructor(client: SmartAccountClient) {
        this.client = client;
    }

    verifySignature (message: Hex, requireMessageVerification: boolean, webAuthnSignature: WebAuthnSignature, x: bigint, y: bigint) {
        return _verifySignature(this.client, message, requireMessageVerification, webAuthnSignature, x, y);
    }
}
