import { WalletClient } from "viem";
import { _getSmartWallet, _getSmartWalletClient } from "../logic/account-kit/createSmartAccount.js";
import { P256Key, KokioSmartAccountClient, KokioSmartAccount } from "../types.js";

export class SmartAccountSubPackage {

    client: WalletClient;
    credentialId;
    rpId;
    pimlicoAPIKey;
    gasPolicyId;

    constructor(client: WalletClient, credentialId: string, rpId: string, pimlicoAPIKey: string, gasPolicyId: string) {
        this.client = client;
        this.credentialId = credentialId;
        this.rpId = rpId;
        this.pimlicoAPIKey = pimlicoAPIKey;
        this.gasPolicyId = gasPolicyId;
    }

    getSmartWallet (deviceUniqueIdentifier: string, deviceWalletOwnerKey: P256Key, salt: bigint) {
        return _getSmartWallet(this.client, this.credentialId, this.rpId, deviceUniqueIdentifier, deviceWalletOwnerKey, salt);
    }

    getSmartWalletClient (account: KokioSmartAccount): Promise<KokioSmartAccountClient> {
        return _getSmartWalletClient(this.client, this.pimlicoAPIKey, this.gasPolicyId, account);
    }
}
