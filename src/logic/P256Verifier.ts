import { encodeFunctionData, WalletClient } from "viem";
import { WebAuthnSignature } from "../types.js";
import { SmartAccountClient } from "@aa-sdk/core";
import { _getChainSpecificConstants, customErrors } from "./constants.js";
import { P256Verifier } from "../abis/index.js";

export const _verifySignature = async (
    client: SmartAccountClient,
    message: string,
    requireMessageVerification: boolean,
    webAuthnSignature: WebAuthnSignature,
    x: bigint,
    y: bigint
) => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);
    if(!client.account) throw new Error(customErrors.MISSING_SMART_WALLET)
    
    // UserOp
    return client.sendUserOperation({
        account: client.account,
        uo:{
            target: values.factoryAddresses.P256VERIFIER,
            data: encodeFunctionData({
                abi: P256Verifier,
                functionName: "deployLazyWalletAndSetESIMIdentifier",
                args: [message, requireMessageVerification, webAuthnSignature, x, y]
            })
        }
    });
}
