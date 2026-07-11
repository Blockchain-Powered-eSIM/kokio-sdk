import { Address, Hex, WalletClient } from "viem";
import { _addOrUpdateLazyWalletRegistryAddress } from "../../logic/admin/registry.eoa.js";
import {
    _eSIMWalletAdmin,
    _vault,
    _upgradeManager,
    _lazyWalletRegistry,
    _uniqueIdentifierToDeviceWallet,
    _deviceWalletToOwner,
    _registeredP256Keys,
    _isDeviceWalletValid,
    _isESIMWalletValid,
    _isESIMWalletOnStandby,
} from "../../logic/admin/registry.reads.js";

/** Thin EOA (owner) wrapper around `Registry`. */
export class AdminRegistrySubPackage {

    walletClient: WalletClient;

    constructor(walletClient: WalletClient) {
        this.walletClient = walletClient;
    }

    addOrUpdateLazyWalletRegistryAddress(lazyWalletRegistry: Address) {
        return _addOrUpdateLazyWalletRegistryAddress(this.walletClient, lazyWalletRegistry);
    }

    // --- Reads (public storage getters, incl. inherited RegistryHelper mappings) ---

    eSIMWalletAdmin() {
        return _eSIMWalletAdmin(this.walletClient);
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
