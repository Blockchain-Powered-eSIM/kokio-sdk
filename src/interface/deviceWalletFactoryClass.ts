import { Address, WalletClient } from "viem";
import {
    _getAddress,
    _getCurrentDeviceWalletImplementation
} from "../logic/deviceWalletFactory"
import { SmartAccountClient } from "@aa-sdk/core";

export class deviceWalletFactorySubPackage {

    client;

    constructor(client: SmartAccountClient) {
        this.client = client;
    }

    getAddress (deviceUniqueIdentifier: string, deviceWalletOwnerKey: string, salt: bigint) {
        return _getAddress(this.client, deviceUniqueIdentifier, deviceWalletOwnerKey, salt);
    }

    getCurrentDeviceWalletImplementation () {
        return _getCurrentDeviceWalletImplementation(this.client);
    }
}
