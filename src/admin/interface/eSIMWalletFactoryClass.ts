import { Address, Hex, WalletClient } from "viem";
import {
    _addRegistryAddress,
    _updateESIMWalletImplementation,
    _acceptOwnership,
    _transferOwnershipCall,
    _upgradeCall,
} from "../../logic/admin/eSIMWalletFactory.eoa.js";
import {
    _isESIMWalletDeployed,
    _getCurrentESIMWalletImplementation,
    _owner,
    _pendingOwner,
    _proxiableUUID,
    _upgradeInterfaceVersion,
} from "../../logic/admin/reads/eSIMWalletFactory.reads.js";

/** Thin EOA (owner) wrapper around `ESIMWalletFactory`. */
export class AdminESIMWalletFactorySubPackage {

    walletClient: WalletClient;

    constructor(walletClient: WalletClient) {
        this.walletClient = walletClient;
    }

    addRegistryAddress(registryContractAddress: Address) {
        return _addRegistryAddress(this.walletClient, registryContractAddress);
    }

    updateESIMWalletImplementation(eSIMWalletImpl: Address) {
        return _updateESIMWalletImplementation(this.walletClient, eSIMWalletImpl);
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

    // Reads: public storage getters and views

    isESIMWalletDeployed(eSIMWallet: Address) {
        return _isESIMWalletDeployed(this.walletClient, eSIMWallet);
    }

    getCurrentESIMWalletImplementation() {
        return _getCurrentESIMWalletImplementation(this.walletClient);
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
}
