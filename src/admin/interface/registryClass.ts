import { Address, Hex, WalletClient } from "viem";
import {
    _addOrUpdateLazyWalletRegistryAddress,
    _updateVaultAddress,
    _requestAdminUpdate,
    _disableAdmin,
    _enableAdmin,
    _acceptAdminUpdate,
    _assignESIMIdentifier,
} from "../../logic/admin/registry.eoa.js";
import {
    _owner,
    _eSIMWalletAdmin,
    _adminOfRecord,
    _adminDisabled,
    _newRequestedAdmin,
    _vault,
    _upgradeManager,
    _lazyWalletRegistry,
    _uniqueIdentifierToDeviceWallet,
    _deviceWalletToOwner,
    _registeredP256Keys,
    _isDeviceWalletValid,
    _isESIMWalletValid,
    _isESIMWalletOnStandby,
} from "../../logic/admin/reads/registry.reads.js";

/** Thin EOA (owner) wrapper around `Registry`. */
export class AdminRegistrySubPackage {

    walletClient: WalletClient;

    constructor(walletClient: WalletClient) {
        this.walletClient = walletClient;
    }

    addOrUpdateLazyWalletRegistryAddress(lazyWalletRegistry: Address) {
        return _addOrUpdateLazyWalletRegistryAddress(this.walletClient, lazyWalletRegistry);
    }

    updateVaultAddress(newVaultAddress: Address) {
        return _updateVaultAddress(this.walletClient, newVaultAddress);
    }

    requestAdminUpdate(newAdmin: Address) {
        return _requestAdminUpdate(this.walletClient, newAdmin);
    }

    disableAdmin() {
        return _disableAdmin(this.walletClient);
    }

    enableAdmin() {
        return _enableAdmin(this.walletClient);
    }

    acceptAdminUpdate() {
        return _acceptAdminUpdate(this.walletClient);
    }

    assignESIMIdentifier(eSIMWalletAddress: Address, eSIMUniqueIdentifier: string) {
        return _assignESIMIdentifier(this.walletClient, eSIMWalletAddress, eSIMUniqueIdentifier);
    }

    // Reads: public storage getters, including the inherited RegistryHelper mappings

    owner() {
        return _owner(this.walletClient);
    }

    eSIMWalletAdmin() {
        return _eSIMWalletAdmin(this.walletClient);
    }

    adminOfRecord() {
        return _adminOfRecord(this.walletClient);
    }

    adminDisabled() {
        return _adminDisabled(this.walletClient);
    }

    newRequestedAdmin() {
        return _newRequestedAdmin(this.walletClient);
    }

    vault() {
        return _vault(this.walletClient);
    }

    upgradeManager() {
        return _upgradeManager(this.walletClient);
    }

    lazyWalletRegistry() {
        return _lazyWalletRegistry(this.walletClient);
    }

    uniqueIdentifierToDeviceWallet(deviceIdentifier: string) {
        return _uniqueIdentifierToDeviceWallet(this.walletClient, deviceIdentifier);
    }

    deviceWalletToOwner(deviceWallet: Address, index: bigint) {
        return _deviceWalletToOwner(this.walletClient, deviceWallet, index);
    }

    registeredP256Keys(hashOfOwnerP256Keys: Hex) {
        return _registeredP256Keys(this.walletClient, hashOfOwnerP256Keys);
    }

    isDeviceWalletValid(deviceWallet: Address) {
        return _isDeviceWalletValid(this.walletClient, deviceWallet);
    }

    isESIMWalletValid(eSIMWallet: Address) {
        return _isESIMWalletValid(this.walletClient, eSIMWallet);
    }

    isESIMWalletOnStandby(eSIMWallet: Address) {
        return _isESIMWalletOnStandby(this.walletClient, eSIMWallet);
    }
}
