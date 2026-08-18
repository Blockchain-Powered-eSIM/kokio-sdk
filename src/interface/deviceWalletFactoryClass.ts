import { Address, WalletClient } from "viem";
import {
    _createAccountWithEOA,
    _getAddress,
    _getCurrentDeviceWalletImplementation
} from "../logic/deviceWalletFactory.js"
import { KokioSmartAccountClient } from "../types.js";
import { P256Key } from "../types.js";

export class DeviceWalletFactorySubPackage {

    smartAccountClient: KokioSmartAccountClient;
    walletClient;

    constructor(walletClient: WalletClient, smartAccountClient: KokioSmartAccountClient) {
        this.smartAccountClient = smartAccountClient;
        this.walletClient = walletClient
    }

    createAccountWithEOA (
        deviceUniqueIdentifier: string,
        deviceWalletOwnerKey: P256Key,
        salt: bigint,
        depositAmount: bigint
    ) {
        return _createAccountWithEOA(this.walletClient, deviceUniqueIdentifier, deviceWalletOwnerKey, salt, depositAmount);
    }

    getAddress (deviceUniqueIdentifier: string, deviceWalletOwnerKey: P256Key, salt: bigint) {
        return _getAddress(this.smartAccountClient, deviceUniqueIdentifier, deviceWalletOwnerKey, salt);
    }

    getCurrentDeviceWalletImplementation () {
        return _getCurrentDeviceWalletImplementation(this.smartAccountClient);
    }
}
