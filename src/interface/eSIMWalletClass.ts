import { Address, WalletClient } from "viem";
import {
    _acceptOwnershipTransfer,
    _buyDataBundle,
    _owner,
    _populateHistory,
    _requestTransferOwnership,
    _sendETHToDeviceWallet,
    _setESIMUniqueIdentifier,
    _transferOwnership
} from "../logic/eSIMWallet"
import { DataBundleDetails } from "../types";
import { SmartAccountClient } from "@aa-sdk/core";

export class eSIMWalletSubPackage {

    client;
    address;

    constructor(client: SmartAccountClient, address: Address) {
        this.client = client;
        this.address = address;
    }

    acceptOwnershipTransfer () {
        return _acceptOwnershipTransfer(this.client, this.address);
    }
    
    buyDataBundle (dataBundleDetails: DataBundleDetails) {
        return _buyDataBundle(this.client, this.address, dataBundleDetails);
    }

    owner () {
        return _owner(this.client, this.address);
    }

    populateHistory (dataBundleDetails: Array<DataBundleDetails>) {
        return _populateHistory(this.client, this.address, dataBundleDetails);
    }

    requestTransferOwnership (newOwner: Address) {
        return _requestTransferOwnership(this.client, this.address, newOwner);
    }

    sendETHToDeviceWallet (amount: bigint) {
        return _sendETHToDeviceWallet(this.client, this.address, amount);
    }
    _setESIMUniqueIdentifier (eSIMUniqueIdentifier: string) {
        return _setESIMUniqueIdentifier(this.client, this.address, eSIMUniqueIdentifier);
    }

    _transferOwnership (amount: bigint) {
        return _transferOwnership(this.client, this.address, amount);
    }
}