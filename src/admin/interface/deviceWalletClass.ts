import { Address, WalletClient } from "viem";
import {
    _deployESIMWallet,
    _setESIMUniqueIdentifierForAnESIMWallet,
} from "../../logic/admin/deviceWallet.eoa.js";

/**
 * Thin EOA wrapper around a specific `DeviceWallet` instance. The instance
 * address is bound at construction; `KokioAdmin.setDeviceWalletAddress` swaps it
 * by re-instantiating this SubPackage.
 */
export class AdminDeviceWalletSubPackage {

    walletClient: WalletClient;
    deviceWalletAddress: Address;

    constructor(walletClient: WalletClient, deviceWalletAddress: Address) {
        this.walletClient = walletClient;
        this.deviceWalletAddress = deviceWalletAddress;
    }

    deployESIMWallet(hasAccessToETH: boolean, salt: bigint) {
        return _deployESIMWallet(this.walletClient, this.deviceWalletAddress, hasAccessToETH, salt);
    }

    setESIMUniqueIdentifierForAnESIMWallet(eSIMWalletAddress: Address, eSIMUniqueIdentifier: string) {
        return _setESIMUniqueIdentifierForAnESIMWallet(this.walletClient, this.deviceWalletAddress, eSIMWalletAddress, eSIMUniqueIdentifier);
    }
}
