import { Address, WalletClient } from "viem";
import { _getSmartWallet, _getSmartWalletClient } from "../logic/account-kit/createSmartAccount.js";
import { P256Key, SignedRequest } from "../types";
import { SmartAccountClient, SmartContractAccount } from "@aa-sdk/core";

export class SmartAccountSubPackage {

    client;
    credentialId;
    rpId;
    organizationId;
    pimlicoAPIKey;
    gasPolicyId;
    
    constructor(client: WalletClient, credentialId: string, rpId: string, organiationId: string, pimlicoAPIKey: string, gasPolicyId: string) {
        this.client = client;
        this.credentialId = credentialId;
        this.rpId = rpId;
        this.organizationId = organiationId;
        this.pimlicoAPIKey = pimlicoAPIKey;
        this.gasPolicyId = gasPolicyId;
    }

    getSmartWallet (deviceUniqueIdentifier: string, deviceWalletOwnerKey: P256Key, salt: bigint) {
        return _getSmartWallet(this.client, this.credentialId, this.rpId, this.organizationId, deviceUniqueIdentifier, deviceWalletOwnerKey, salt);
    }

    getSmartWalletClient (account: SmartContractAccount) {
        return _getSmartWalletClient(this.client, this.pimlicoAPIKey, this.gasPolicyId, account);
    }
}
