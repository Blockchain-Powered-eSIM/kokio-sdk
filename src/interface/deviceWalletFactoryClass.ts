import { Address, WalletClient } from "viem";
import {
    _createAccount,
    _getAddress,
    _getCurrentDeviceWalletImplementation
} from "../logic/deviceWalletFactory"

export class deviceWalletFactorySubPackage {

    client;

    constructor(client: WalletClient) {
        this.client = client;
    }

    createAccount (deviceUniqueIdentifier: string, deviceWalletOwnerKey: string, salt: bigint, depositAmount: bigint) {
        return _createAccount(this.client, deviceUniqueIdentifier, deviceWalletOwnerKey, salt, depositAmount);
    }
    getAddress (deviceUniqueIdentifier: string, deviceWalletOwnerKey: string, salt: bigint) {
        return _getAddress(this.client, deviceUniqueIdentifier, deviceWalletOwnerKey, salt);
    }

    getCurrentDeviceWalletImplementation () {
        return _getCurrentDeviceWalletImplementation(this.client);
    }
}
