import { Address, WalletClient } from "viem";
import { _addOrUpdateLazyWalletRegistryAddress } from "../../logic/admin/registry.eoa.js";

/** Thin EOA (owner) wrapper around `Registry`. */
export class AdminRegistrySubPackage {

    walletClient: WalletClient;

    constructor(walletClient: WalletClient) {
        this.walletClient = walletClient;
    }

    addOrUpdateLazyWalletRegistryAddress(lazyWalletRegistry: Address) {
        return _addOrUpdateLazyWalletRegistryAddress(this.walletClient, lazyWalletRegistry);
    }
}
