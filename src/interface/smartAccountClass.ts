import { Address, WalletClient } from "viem";
import { _getSmartWallet, _getSmartWalletClient } from "../logic/account-kit/createSmartAccount.js";
import { P256Key, SignedRequest } from "../types";
import { SmartAccountClient, SmartContractAccount } from "@aa-sdk/core";
import { TurnkeyClient } from "@turnkey/http";

export class smartAccountSubPackage {

    client;
    turnkeyClient;
    organizationId; 
    
    constructor(client: WalletClient, turnkeyClient: TurnkeyClient, organiationId: string) {
        this.client = client;
        this.turnkeyClient = turnkeyClient;
        this.organizationId = organiationId;
    }

    getSmartWallet (deviceUniqueIdentifier: string, deviceWalletOwnerKey: P256Key, salt: bigint, sender?: Address) {
        return _getSmartWallet(this.client, this.turnkeyClient, this.organizationId, deviceUniqueIdentifier, deviceWalletOwnerKey, salt, sender)
    }

    getSmartWalletClient (account: SmartContractAccount) {
        return _getSmartWalletClient(this.client, account)
    }
}