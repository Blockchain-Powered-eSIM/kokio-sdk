import { Address, WalletClient } from "viem";
import {
    _addRegistryAddress,
    _updateESIMWalletImplementation,
} from "../../logic/admin/eSIMWalletFactory.eoa.js";

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
}
