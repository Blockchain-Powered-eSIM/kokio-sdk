import { Address, Hex, WalletClient } from "viem";
import { _chainId, _getChainSpecificConstants } from "../constants.js";
import { AdminAllowanceExceededError, MissingEOAWalletError, writeContractOrThrow } from "../errors.js";
import { ESIMWallet } from "../../abis/index.js";
import { DataBundleDetails } from "../../types.js";
import { _adminAllowanceUSDCents } from "./reads/eSIMWallet.reads.js";

// Admin-EOA logic targeting a specific `ESIMWallet` instance (address passed in).
// `buyDataBundleWithToken` is `onlyDeviceWalletOrESIMWalletAdmin`, so the admin
// EOA can call it directly.

/**
 * Buy a data bundle in `asset`, an ERC-20 the payment adapter accepts.
 * `onlyDeviceWalletOrESIMWalletAdmin`.
 *
 * `maxAmountIn` is the most of `asset` the buyer will spend, in its smallest
 * unit - read it from `paymentAdapter.quote(asset, dataBundleDetails.priceUSDCents)`
 * first. `paymentReference` ties this purchase to its offchain order and is
 * spendable once per eSIM wallet.
 *
 * Throws `AdminAllowanceExceededError` without sending when the price is above
 * what the wallet's owner still allows the admin to charge.
 */
export const _buyDataBundleWithToken = async (
    client: WalletClient,
    eSIMWalletAddress: Address,
    dataBundleDetails: DataBundleDetails,
    asset: Hex,
    maxAmountIn: bigint,
    paymentReference: Hex
) => {

    const chainID = await _chainId(client);
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    if (!client.account) throw new MissingEOAWalletError();

    const remaining = await _adminAllowanceUSDCents(client, eSIMWalletAddress);
    if (dataBundleDetails.priceUSDCents > remaining) {
        throw new AdminAllowanceExceededError(dataBundleDetails.priceUSDCents, remaining);
    }

    return writeContractOrThrow(client, {
        address: eSIMWalletAddress,
        chain: values.chain,
        account: client.account,
        abi: ESIMWallet,
        functionName: 'buyDataBundleWithToken',
        args: [dataBundleDetails, asset, maxAmountIn, paymentReference]
    });
}
