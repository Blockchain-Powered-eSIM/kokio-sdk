import { WalletClient } from "viem";
import { DataBundleDetails, P256Key } from "../../types.js";
import {
    _batchPopulateHistory,
    _deployLazyWalletAndSetESIMIdentifier,
    _switchESIMIdentifierToNewDeviceIdentifier,
} from "../../logic/admin/lazyWalletRegistry.eoa.js";

/** Thin EOA (eSIMWalletAdmin) wrapper around `LazyWalletRegistry`. */
export class AdminLazyWalletRegistrySubPackage {

    walletClient: WalletClient;

    constructor(walletClient: WalletClient) {
        this.walletClient = walletClient;
    }

    batchPopulateHistory(
        deviceUniqueIdentifiers: Array<string>,
        eSIMUniqueIdentifiers: Array<Array<string>>,
        dataBundleDetails: Array<Array<DataBundleDetails>>
    ) {
        return _batchPopulateHistory(this.walletClient, deviceUniqueIdentifiers, eSIMUniqueIdentifiers, dataBundleDetails);
    }

    deployLazyWalletAndSetESIMIdentifier(
        deviceOwnerPublicKey: P256Key,
        deviceUniqueIdentifier: string,
        salt: bigint,
        depositAmount: bigint
    ) {
        return _deployLazyWalletAndSetESIMIdentifier(this.walletClient, deviceOwnerPublicKey, deviceUniqueIdentifier, salt, depositAmount);
    }

    switchESIMIdentifierToNewDeviceIdentifier(
        eSIMIdentifier: string,
        oldDeviceIdentifier: string,
        newDeviceIdentifier: string
    ) {
        return _switchESIMIdentifierToNewDeviceIdentifier(this.walletClient, eSIMIdentifier, oldDeviceIdentifier, newDeviceIdentifier);
    }
}
