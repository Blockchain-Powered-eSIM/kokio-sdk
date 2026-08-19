import { Address, Hex, WalletClient } from "viem";
import { P256Key } from "../../types.js";
import { _createAccountWithEOA } from "../../logic/deviceWalletFactory.js";
import {
    _deployDeviceWalletForUsers,
    _postCreateAccount,
    _addRegistryAddress,
    _updateDeviceWalletImplementation,
    _acceptOwnership,
    _transferOwnershipCall,
    _upgradeCall,
} from "../../logic/admin/deviceWalletFactory.eoa.js";
import {
    _eSIMWalletAdmin,
    _deviceWalletInfoAdded,
    _getCurrentDeviceWalletImplementation,
    _getCounterFactualAddress,
    _preCreateAccountValidation,
    _beacon,
    _registry,
    _entryPoint,
    _verifier,
    _owner,
    _pendingOwner,
    _proxiableUUID,
    _upgradeInterfaceVersion,
} from "../../logic/admin/reads/deviceWalletFactory.reads.js";

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

    postCreateAccount(deviceWallet: Address, deviceUniqueIdentifier: string, deviceWalletOwnerKey: P256Key, salt: bigint) {
        return _postCreateAccount(this.walletClient, deviceWallet, deviceUniqueIdentifier, deviceWalletOwnerKey, salt);
    }

    addRegistryAddress(registryContractAddress: Address) {
        return _addRegistryAddress(this.walletClient, registryContractAddress);
    }

    updateDeviceWalletImplementation(newDeviceImpl: Address) {
        return _updateDeviceWalletImplementation(this.walletClient, newDeviceImpl);
    }

    // Reads: public storage getters and views

    eSIMWalletAdmin() {
        return _eSIMWalletAdmin(this.walletClient);
    }

    deviceWalletInfoAdded(deviceWallet: Address) {
        return _deviceWalletInfoAdded(this.walletClient, deviceWallet);
    }

    getCurrentDeviceWalletImplementation() {
        return _getCurrentDeviceWalletImplementation(this.walletClient);
    }

    getCounterFactualAddress(deviceWalletOwnerKey: P256Key, deviceUniqueIdentifier: string, salt: bigint) {
        return _getCounterFactualAddress(this.walletClient, deviceWalletOwnerKey, deviceUniqueIdentifier, salt);
    }

    preCreateAccountValidation(deviceUniqueIdentifier: string, deviceWalletOwnerKey: P256Key) {
        return _preCreateAccountValidation(this.walletClient, deviceUniqueIdentifier, deviceWalletOwnerKey);
    }

    beacon() {
        return _beacon(this.walletClient);
    }

    registry() {
        return _registry(this.walletClient);
    }

    entryPoint() {
        return _entryPoint(this.walletClient);
    }

    verifier() {
        return _verifier(this.walletClient);
    }

    owner() {
        return _owner(this.walletClient);
    }

    pendingOwner() {
        return _pendingOwner(this.walletClient);
    }

    proxiableUUID() {
        return _proxiableUUID(this.walletClient);
    }

    upgradeInterfaceVersion() {
        return _upgradeInterfaceVersion(this.walletClient);
    }

    acceptOwnership() {
        return _acceptOwnership(this.walletClient);
    }

    // Owner payloads: hand the result to `protocolAdmin.schedule`

    transferOwnershipCall(newOwner: Address) {
        return _transferOwnershipCall(this.walletClient, newOwner);
    }

    upgradeCall(newImplementation: Address, data?: Hex) {
        return _upgradeCall(this.walletClient, newImplementation, data);
    }
}
