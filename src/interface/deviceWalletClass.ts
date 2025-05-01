import { Address, WalletClient } from "viem";
import {
    _addESIMWallet,
    _deployESIMWallet,
    _getOwner,
    _getVaultAddress,
    _payETHForDataBundles,
    _pullETH,
    _removeESIMWallet,
    _setESIMUniqueIdentifierForAnESIMWallet,
    _toggleAccessToETH
} from "../logic/deviceWallet.js"
import { SmartAccountClient } from "@aa-sdk/core";

export class DeviceWalletSubPackage {

    smartAccountClient;
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

    deployESIMWallet (hasAccessToETH: boolean, salt: bigint) {
        return _deployESIMWallet(this.smartAccountClient, this.address, hasAccessToETH, salt);
    }

    getVaultAddress () {
        return _getVaultAddress(this.smartAccountClient, this.address);
    }

    payETHForDataBundles (amount: bigint) {
        return _payETHForDataBundles(this.smartAccountClient, this.address, amount);
    }

    pullETH (amount: bigint) {
        return _pullETH(this.smartAccountClient, this.address, amount);
    }

    removeESIMWallet (eSIMWalletAddress: Address, hasAccessToETH: boolean) {
        return _removeESIMWallet(this.smartAccountClient, this.address, eSIMWalletAddress, hasAccessToETH);
    }

    setESIMUniqueIdentifierForAnESIMWallet (eSIMWalletAddress: Address, eSIMUniqueIdentifier: string) {
        return _setESIMUniqueIdentifierForAnESIMWallet(this.smartAccountClient, this.address, eSIMWalletAddress, eSIMUniqueIdentifier);
    }

    toggleAccessToETH (eSIMWalletAddress: Address, hasAccessToETH: boolean) {
        return _toggleAccessToETH(this.smartAccountClient, this.address, eSIMWalletAddress, hasAccessToETH);
    }

    getOwner () {
        return _getOwner (this.walletClient, this.address);
    }
}