import { WalletClient } from "viem";
import { _getSmartWallet, _getSmartWalletClient } from "../logic/account-kit/createSmartAccount";
import { PublicKey, SignedRequest } from "../types";
import { SmartAccountClient, SmartContractAccount } from "@aa-sdk/core";

export class smartAccountSubPackage {

    client; 
    
    constructor(client: WalletClient) {
        this.client = client;
    }

    getSmartWallet (deviceUniqueIdentifier: string, deviceWalletOwnerKey: PublicKey, salt: bigint, depositAmount: bigint, signedRequest: SignedRequest) {
        return _getSmartWallet(this.client, deviceUniqueIdentifier, deviceWalletOwnerKey, salt, depositAmount, signedRequest)
    }

    getSmartWalletClient (account: SmartContractAccount) {
        return _getSmartWalletClient(this.client, account)
    }
}