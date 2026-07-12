import { Address, WalletClient } from "viem";
import {
    _addRegistryAddress,
    _updateESIMWalletImplementation,
} from "../../logic/admin/eSIMWalletFactory.eoa.js";
import {
    _isESIMWalletDeployed,
    _getCurrentESIMWalletImplementation,
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

    // Reads: public storage getters and views

    isESIMWalletDeployed(eSIMWallet: Address) {
        return _isESIMWalletDeployed(this.walletClient, eSIMWallet);
    }

    getCurrentESIMWalletImplementation() {
        return _getCurrentESIMWalletImplementation(this.walletClient);
    }
}
