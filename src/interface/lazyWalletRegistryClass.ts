import { Address, Hex, WalletClient } from "viem";
import {
    _batchPopulateHistory,
    _deployLazyWalletAndSetESIMIdentifier,
    _isLazyWalletDeployed,
    _switchESIMIdentifierToNewDeviceIdentifier
} from "../logic/lazyWalletRegistry.js"
import { DataBundleDetails } from "../types";
import { SmartAccountClient } from "@aa-sdk/core";

export class lazyWalletRegistrySubPackage {

    client;

    constructor(client: SmartAccountClient) {
        this.client = client;
    }

    _batchPopulateHistory (deviceUniqueIdentifiers: Array<string>, eSIMUniqueIdentifiers: Array<Array<string>>, dataBundleDetails: Array<Array<DataBundleDetails>>) {
        return _batchPopulateHistory(this.client, deviceUniqueIdentifiers, eSIMUniqueIdentifiers, dataBundleDetails);
    }

    _deployLazyWalletAndSetESIMIdentifier (deviceOwnerPublicKey: Hex[2], deviceUniqueIdentifier: string, salt: bigint, depositAmount: bigint) {
        return _deployLazyWalletAndSetESIMIdentifier(this.client, deviceOwnerPublicKey, deviceUniqueIdentifier, salt, depositAmount);
    }

    _isLazyWalletDeployed (deviceUniqueIdentifier: string) {
        return _isLazyWalletDeployed(this.client, deviceUniqueIdentifier);
    }

    _switchESIMIdentifierToNewDeviceIdentifier (eSIMIdentifier: string, oldDeviceIdentifier: string, newDeviceIdentifier: string) {
        return _switchESIMIdentifierToNewDeviceIdentifier(this.client, eSIMIdentifier, oldDeviceIdentifier, newDeviceIdentifier);
    }
}