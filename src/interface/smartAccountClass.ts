import { Address, WalletClient } from "viem";
import { _getSmartWallet, _getSmartWalletClient } from "../logic/account-kit/createSmartAccount.js";
import { P256Key, SignedRequest } from "../types";
import { SmartAccountClient, SmartContractAccount } from "@aa-sdk/core";
import { TurnkeyClient } from "@turnkey/http";

export class SmartAccountSubPackage {

    client;
    turnkeyClient;
    credentialId;
    rpId;
    organizationId; 
    gasPolicyId;
    
    constructor(client: WalletClient, turnkeyClient: TurnkeyClient, credentialId: string, rpId: string, organiationId: string, gasPolicyId: string) {
        this.client = client;
        this.turnkeyClient = turnkeyClient;
        this.credentialId = credentialId;
        this.rpId = rpId;
        this.organizationId = organiationId;
        this.gasPolicyId = gasPolicyId;
    }

    getSmartWallet (deviceUniqueIdentifier: string, deviceWalletOwnerKey: P256Key, salt: bigint) {
        return _getSmartWallet(this.client, this.turnkeyClient, this.credentialId, this.rpId, this.organizationId, deviceUniqueIdentifier, deviceWalletOwnerKey, salt);
    }

    getSmartWalletClient (account: SmartContractAccount) {
        return _getSmartWalletClient(this.client, this.gasPolicyId, account);
    }
}