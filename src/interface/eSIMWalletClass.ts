import { Address } from "viem";
import {
    _acceptOwnershipTransfer,
    _buyDataBundle,
    _owner,
    _requestTransferOwnership,
    _sendETHToDeviceWallet,
    _setESIMUniqueIdentifier
} from "../logic/eSIMWallet.js"
import { DataBundleDetails } from "../types";
import { SmartAccountClient } from "@aa-sdk/core";

export class ESIMWalletSubPackage {

    client: SmartAccountClient;
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

    requestTransferOwnership (newOwner: Address) {
        return _requestTransferOwnership(this.client, this.address, newOwner);
    }

    sendETHToDeviceWallet (amount: bigint) {
        return _sendETHToDeviceWallet(this.client, this.address, amount);
    }

    setESIMUniqueIdentifier (eSIMUniqueIdentifier: string) {
        return _setESIMUniqueIdentifier(this.client, this.address, eSIMUniqueIdentifier);
    }
}
