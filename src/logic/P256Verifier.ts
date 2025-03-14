import { WalletClient } from "viem";
import { getContractInstance } from "./contracts";
import { WebAuthnSignature } from "../types";

export const _verifySignature = async (
    client: WalletClient,
    message: string,
    requireMessageVerification: boolean,
    webAuthnSignature: WebAuthnSignature,
    x: bigint,
    y: bigint
) => {

    const contract = (await getContractInstance(client)).P256Verifier();
    
    return contract.write.verifySignature([message, requireMessageVerification, webAuthnSignature, x, y])
}