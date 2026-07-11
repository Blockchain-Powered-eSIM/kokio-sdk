import { Address, WalletClient } from "viem";
import { P256Key } from "../../types.js";
import { _createAccountWithEOA } from "../../logic/deviceWalletFactory.js";
import {
    _deployDeviceWalletForUsers,
    _postCreateAccount,
    _addRegistryAddress,
    _updateVaultAddress,
    _requestAdminUpdate,
    _acceptAdminUpdate,
    _updateDeviceWalletImplementation,
} from "../../logic/admin/deviceWalletFactory.eoa.js";

/**
 * Thin EOA wrapper around `DeviceWalletFactory`. Holds only the wallet client;
 * every method forwards to a logic function. `createAccountWithEOA` reuses the
 * existing shared logic (the same call the mobile surface exposes).
 */
export class AdminDeviceWalletFactorySubPackage {

    walletClient: WalletClient;

    constructor(walletClient: WalletClient) {
        this.walletClient = walletClient;
    }

    createAccount(deviceUniqueIdentifier: string, deviceWalletOwnerKey: P256Key, salt: bigint, depositAmount: bigint) {
        return _createAccountWithEOA(this.walletClient, deviceUniqueIdentifier, deviceWalletOwnerKey, salt, depositAmount);
    }

    deployDeviceWalletForUsers(
        deviceUniqueIdentifiers: Array<string>,
        deviceWalletOwnersKey: Array<P256Key>,
        salts: Array<bigint>,
        depositAmounts: Array<bigint>,
        value: bigint
    ) {
        return _deployDeviceWalletForUsers(this.walletClient, deviceUniqueIdentifiers, deviceWalletOwnersKey, salts, depositAmounts, value);
    }

    postCreateAccount(deviceWallet: Address, deviceUniqueIdentifier: string, deviceWalletOwnerKey: P256Key) {
        return _postCreateAccount(this.walletClient, deviceWallet, deviceUniqueIdentifier, deviceWalletOwnerKey);
    }

    addRegistryAddress(registryContractAddress: Address) {
        return _addRegistryAddress(this.walletClient, registryContractAddress);
    }

    updateVaultAddress(newVaultAddress: Address) {
        return _updateVaultAddress(this.walletClient, newVaultAddress);
    }

    requestAdminUpdate(newAdmin: Address) {
        return _requestAdminUpdate(this.walletClient, newAdmin);
    }

    acceptAdminUpdate() {
        return _acceptAdminUpdate(this.walletClient);
    }

    updateDeviceWalletImplementation(newDeviceImpl: Address) {
        return _updateDeviceWalletImplementation(this.walletClient, newDeviceImpl);
    }
}
