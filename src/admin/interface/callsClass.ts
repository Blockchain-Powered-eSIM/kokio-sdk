import { Address, Hex, WalletClient, publicActions } from "viem";
import { DataBundleDetails } from "../../types.js";
import { _acceptAndBindESIMWalletCalls, _buyDataBundleWithTransferCalls } from "../../logic/calls/eSIMWallet.calls.js";

/**
 * Builds the calls a user's device wallet signs as one user operation. Nothing
 * is signed or sent here: hand the result to the app, which passes it to
 * `deviceWallet.sendUserOperation`. Addresses are passed per call, since one
 * backend builds calls for many users.
 */
export class AdminCallsSubPackage {

    walletClient: WalletClient;

    constructor(walletClient: WalletClient) {
        this.walletClient = walletClient;
    }

    /**
     * The calls `kokio.eSIMWallet.buyDataBundleWithTransfer` sends: a token
     * transfer from the device wallet for whatever the eSIM wallet is short of,
     * then the purchase. The purchase emits `DataBundleBoughtWithToken` as usual.
     */
    buyDataBundleWithTransfer(eSIMWalletAddress: Address, dataBundleDetails: DataBundleDetails, asset: Hex, maxAmountIn: bigint, paymentReference: Hex) {
        return _buyDataBundleWithTransferCalls(this.walletClient.extend(publicActions), eSIMWalletAddress, dataBundleDetails, asset, maxAmountIn, paymentReference);
    }

    /**
     * The calls `kokio.eSIMWallet.acceptAndBindESIMWallet` sends, for the device
     * wallet named in `requestTransferOwnership` to sign. Build them once the
     * `OwnershipTransferRequested` event names that device wallet as `_newOwner`.
     */
    acceptAndBindESIMWallet(eSIMWalletAddress: Address, newDeviceWalletAddress: Address, options: { grantAccessToFunds?: boolean } = {}) {
        return _acceptAndBindESIMWalletCalls(eSIMWalletAddress, newDeviceWalletAddress, options.grantAccessToFunds ?? false);
    }
}
