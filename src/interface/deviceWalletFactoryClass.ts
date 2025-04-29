import { Address, WalletClient } from "viem";
import {
    _createAccountWithEOA,
    _getAddress,
    _getCurrentDeviceWalletImplementation
} from "../logic/deviceWalletFactory.js"
import { SmartAccountClient } from "@aa-sdk/core";

export class deviceWalletFactorySubPackage {

    smartAccountClient;
    walletClient;

    constructor(walletClient: WalletClient, smartAccountClient: SmartAccountClient) {
        this.smartAccountClient = smartAccountClient;
        this.walletClient = walletClient
    }

    createAccountWithEOA (
        deviceUniqueIdentifier: string,
        deviceWalletOwnerKey: string,
        salt: bigint,
        depositAmount: bigint
    ) {
        return _createAccountWithEOA(this.walletClient, deviceUniqueIdentifier, deviceWalletOwnerKey, salt, depositAmount);
    }

    getAddress (deviceUniqueIdentifier: string, deviceWalletOwnerKey: string, salt: bigint) {
        return _getAddress(this.smartAccountClient, deviceUniqueIdentifier, deviceWalletOwnerKey, salt);
    }

    getCurrentDeviceWalletImplementation () {
        return _getCurrentDeviceWalletImplementation(this.smartAccountClient);
    }
}
