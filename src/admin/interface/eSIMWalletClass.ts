import { Address, WalletClient } from "viem";
import { DataBundleDetails } from "../../types.js";
import { _buyDataBundle } from "../../logic/admin/eSIMWallet.eoa.js";

/**
 * Thin EOA wrapper around a specific `ESIMWallet` instance. The instance address
 * is bound at construction; `KokioAdmin.setESIMWalletAddress` swaps it by
 * re-instantiating this SubPackage.
 */
export class AdminESIMWalletSubPackage {

    walletClient: WalletClient;
    eSIMWalletAddress: Address;

    constructor(walletClient: WalletClient, eSIMWalletAddress: Address) {
        this.walletClient = walletClient;
        this.eSIMWalletAddress = eSIMWalletAddress;
    }

    buyDataBundle(dataBundleDetails: DataBundleDetails, value: bigint = 0n) {
        return _buyDataBundle(this.walletClient, this.eSIMWalletAddress, dataBundleDetails, value);
    }
}
