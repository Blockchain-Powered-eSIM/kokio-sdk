import { WalletClient } from "viem";
import { DataBundleDetails, P256Key } from "../../types.js";
import {
    _batchPopulateHistory,
    _deployLazyWalletAndSetESIMIdentifier,
    _switchESIMIdentifierToNewDeviceIdentifier,
} from "../../logic/admin/lazyWalletRegistry.eoa.js";
import {
    _upgradeManager,
    _eSIMIdentifierToDeviceIdentifier,
    _deviceIdentifierToESIMDetails,
    _eSIMIdentifiersAssociatedWithDeviceIdentifier,
} from "../../logic/admin/reads/lazyWalletRegistry.reads.js";

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

    // Reads: public storage getters

    upgradeManager() {
        return _upgradeManager(this.walletClient);
    }

    eSIMIdentifierToDeviceIdentifier(eSIMIdentifier: string) {
        return _eSIMIdentifierToDeviceIdentifier(this.walletClient, eSIMIdentifier);
    }

    // Array-backed getters take an element index and return one entry - iterate
    // indices to read the full list (there is no on-chain full-array getter).
    deviceIdentifierToESIMDetails(deviceIdentifier: string, eSIMIdentifier: string, index: bigint) {
        return _deviceIdentifierToESIMDetails(this.walletClient, deviceIdentifier, eSIMIdentifier, index);
    }

    eSIMIdentifiersAssociatedWithDeviceIdentifier(deviceIdentifier: string, index: bigint) {
        return _eSIMIdentifiersAssociatedWithDeviceIdentifier(this.walletClient, deviceIdentifier, index);
    }
}
