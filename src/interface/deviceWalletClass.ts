import { Address, WalletClient } from "viem";
import {
    _addESIMWallet,
    _getOwner,
    _getVaultAddress,
    _removeESIMWallet,
    _toggleAccessToETH
} from "../logic/deviceWallet.js"
import { SmartAccountClient } from "@aa-sdk/core";

export class DeviceWalletSubPackage {

    smartAccountClient: SmartAccountClient;
    walletClient;
    address;

    constructor(walletClient: WalletClient, smartAccountClient: SmartAccountClient, address: Address) {
        this.smartAccountClient = smartAccountClient;
        this.walletClient = walletClient;
        this.address = address;
    }

    addESIMWallet (eSIMWalletAddress: Address, hasAccessToETH: boolean) {
        return _addESIMWallet(this.smartAccountClient, this.address, eSIMWalletAddress, hasAccessToETH);
    }

    getVaultAddress () {
        return _getVaultAddress(this.smartAccountClient, this.address);
    }

    removeESIMWallet (eSIMWalletAddress: Address, hasAccessToETH: boolean) {
        return _removeESIMWallet(this.smartAccountClient, this.address, eSIMWalletAddress, hasAccessToETH);
    }

    toggleAccessToETH (eSIMWalletAddress: Address, hasAccessToETH: boolean) {
        return _toggleAccessToETH(this.smartAccountClient, this.address, eSIMWalletAddress, hasAccessToETH);
    }

    getOwner () {
        return _getOwner (this.walletClient, this.address);
    }
}
