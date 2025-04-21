import { Address, WalletClient } from "viem";
import {
    _addESIMWallet,
    _deployESIMWallet,
    _getVaultAddress,
    _payETHForDataBundles,
    _pullETH,
    _removeESIMWallet,
    _setESIMUniqueIdentifierForAnESIMWallet,
    _toggleAccessToETH
} from "../logic/deviceWallet.js"
import { SmartAccountClient } from "@aa-sdk/core";

export class deviceWalletSubPackage {

    client;
    address;

    constructor(client: SmartAccountClient, address: Address) {
        this.client = client;
        this.address = address;
    }

    addESIMWallet (eSIMWalletAddress: Address, hasAccessToETH: boolean) {
        return _addESIMWallet(this.client, this.address, eSIMWalletAddress, hasAccessToETH);
    }

    deployESIMWallet (hasAccessToETH: boolean, salt: bigint) {
        return _deployESIMWallet(this.client, this.address, hasAccessToETH, salt);
    }

    getVaultAddress () {
        return _getVaultAddress(this.client, this.address);
    }

    payETHForDataBundles (amount: bigint) {
        return _payETHForDataBundles(this.client, this.address, amount);
    }

    pullETH (amount: bigint) {
        return _pullETH(this.client, this.address, amount);
    }

    removeESIMWallet (eSIMWalletAddress: Address, hasAccessToETH: boolean) {
        return _removeESIMWallet(this.client, this.address, eSIMWalletAddress, hasAccessToETH);
    }

    setESIMUniqueIdentifierForAnESIMWallet (eSIMWalletAddress: Address, eSIMUniqueIdentifier: string) {
        return _setESIMUniqueIdentifierForAnESIMWallet(this.client, this.address, eSIMWalletAddress, eSIMUniqueIdentifier);
    }

    toggleAccessToETH (eSIMWalletAddress: Address, hasAccessToETH: boolean) {
        return _toggleAccessToETH(this.client, this.address, eSIMWalletAddress, hasAccessToETH);
    }
}