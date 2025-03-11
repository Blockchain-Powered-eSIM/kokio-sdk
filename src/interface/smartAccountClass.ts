import { WalletClient } from "viem";
import { _getSmartWallet, _getSmartWalletClient } from "../logic/account-kit/createSmartAccount";
import { PublicKey } from "../types";
import { SmartContractAccount } from "@aa-sdk/core";

export class smartAccountSubPackage {

    client; 
    
    constructor(client: WalletClient) {
        this.client = client;
    }

    getSmartWallet (publicKey: PublicKey) {
        return _getSmartWallet(this.client, publicKey)
    }

    getSmartWalletClient (account: SmartContractAccount) {
        return _getSmartWalletClient(account)
    }
}