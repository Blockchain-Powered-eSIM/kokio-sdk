import { Address } from "viem";
import {
    _acceptOwnershipTransfer,
    _buyDataBundle,
    _dataBundlePriceCap,
    _deviceWallet,
    _owner,
    _requestTransferOwnership,
    _sendETHToDeviceWallet,
    _setDataBundlePriceCap,
    _transactionHistory
} from "../logic/eSIMWallet.js"
import { DataBundleDetails } from "../types";
import { KokioSmartAccountClient } from "../types.js";

export class ESIMWalletSubPackage {

    client: KokioSmartAccountClient;
    address;

    constructor(client: KokioSmartAccountClient, address: Address) {
        this.client = client;
        this.address = address;
    }

    acceptOwnershipTransfer () {
        return _acceptOwnershipTransfer(this.client, this.address);
    }

    buyDataBundle (dataBundleDetails: DataBundleDetails) {
        return _buyDataBundle(this.client, this.address, dataBundleDetails);
    }

    dataBundlePriceCap () {
        return _dataBundlePriceCap(this.client, this.address);
    }

    deviceWallet () {
        return _deviceWallet(this.client, this.address);
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

    setDataBundlePriceCap (cap: bigint) {
        return _setDataBundlePriceCap(this.client, this.address, cap);
    }

    transactionHistory (index: bigint) {
        return _transactionHistory(this.client, this.address, index);
    }
}
