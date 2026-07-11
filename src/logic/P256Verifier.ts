import { encodeFunctionData, Hex, WalletClient } from "viem";
import { WebAuthnSignature } from "../types.js";
import { SmartAccountClient } from "@aa-sdk/core";
import { _getChainSpecificConstants } from "./constants.js";
import { MissingSmartWalletError } from "./errors.js";
import { P256Verifier } from "../abis/index.js";

export const _verifySignature = async (
    client: SmartAccountClient,
    message: Hex,
    requireMessageVerification: boolean,
    webAuthnSignature: WebAuthnSignature,
    x: bigint,
    y: bigint
) => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);
    if(!client.account) throw new MissingSmartWalletError()
    
    // UserOp
    return client.sendUserOperation({
        account: client.account,
        uo:{
            target: values.factoryAddresses.P256VERIFIER,
            data: encodeFunctionData({
                abi: P256Verifier,
                functionName: "verifySignature",
                args: [message, requireMessageVerification, webAuthnSignature, x, y]
            })
        }
    });
}
