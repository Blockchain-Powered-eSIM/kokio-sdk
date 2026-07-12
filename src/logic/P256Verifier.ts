import { Hex } from "viem";
import { WebAuthnSignature } from "../types.js";
import { SmartAccountClient } from "@aa-sdk/core";
import { _getChainSpecificConstants } from "./constants.js";
import { P256Verifier } from "../abis/index.js";

// `verifySignature` is a `view` - read it directly instead of spending a userOp
// (the previous userOp form returned a userOp hash, never the boolean result).
export const _verifySignature = async (
    client: SmartAccountClient,
    message: Hex,
    requireMessageVerification: boolean,
    webAuthnSignature: WebAuthnSignature,
    x: bigint,
    y: bigint
): Promise<boolean> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.readContract({
        address: values.factoryAddresses.P256VERIFIER,
        abi: P256Verifier,
        functionName: "verifySignature",
        args: [message, requireMessageVerification, webAuthnSignature, x, y]
    }) as Promise<boolean>;
}
