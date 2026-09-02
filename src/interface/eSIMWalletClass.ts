import { Address, Hex } from "viem";
import {
    _acceptOwnershipTransfer,
    _buyDataBundleWithToken,
    _priceCapUSDCents,
    _deviceWallet,
    _owner,
    _requestTransferOwnership,
    _sendETHToDeviceWallet,
    _sendTokenToDeviceWallet,
    _setPriceCapUSDCents,
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

    buyDataBundleWithToken (dataBundleDetails: DataBundleDetails, asset: Hex, maxAmountIn: bigint, paymentReference: Hex) {
        return _buyDataBundleWithToken(this.client, this.address, dataBundleDetails, asset, maxAmountIn, paymentReference);
    }

    priceCapUSDCents () {
        return _priceCapUSDCents(this.client, this.address);
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

    sendTokenToDeviceWallet (token: Address, amount: bigint) {
        return _sendTokenToDeviceWallet(this.client, this.address, token, amount);
    }

    setPriceCapUSDCents (cap: bigint) {
        return _setPriceCapUSDCents(this.client, this.address, cap);
    }

    transactionHistory (index: bigint) {
        return _transactionHistory(this.client, this.address, index);
    }
}
