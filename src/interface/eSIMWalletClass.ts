import { Address, Hex } from "viem";
import {
    _acceptAndBindESIMWallet,
    _acceptOwnershipTransfer,
    _buyDataBundleWithToken,
    _buyDataBundleWithTransfer,
    _priceCapUSDCents,
    _deviceWallet,
    _owner,
    _requestTransferOwnership,
    _sendETHToDeviceWallet,
    _sendTokenToDeviceWallet,
    _setPriceCapUSDCents,
    _transactionHistory
} from "../logic/eSIMWallet.js"
import { DataBundleDetails } from "../types.js";
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

    /**
     * Accept this eSIM wallet's transfer and bind it to the signing device
     * wallet in one user operation, optionally granting it access to that
     * wallet's tokens too.
     */
    acceptAndBindESIMWallet (options: { grantAccessToFunds?: boolean } = {}) {
        return _acceptAndBindESIMWallet(this.client, this.address, options.grantAccessToFunds ?? false);
    }

    buyDataBundleWithToken (dataBundleDetails: DataBundleDetails, asset: Hex, maxAmountIn: bigint, paymentReference: Hex) {
        return _buyDataBundleWithToken(this.client, this.address, dataBundleDetails, asset, maxAmountIn, paymentReference);
    }

    /**
     * Same purchase as `buyDataBundleWithToken`, with the device wallet sending
     * the tokens it needs in the same user operation. Works without having granted
     * this eSIM wallet access to the device wallet's funds.
     */
    buyDataBundleWithTransfer (dataBundleDetails: DataBundleDetails, asset: Hex, maxAmountIn: bigint, paymentReference: Hex) {
        return _buyDataBundleWithTransfer(this.client, this.address, dataBundleDetails, asset, maxAmountIn, paymentReference);
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
