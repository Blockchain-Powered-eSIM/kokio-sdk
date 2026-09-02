import { Address, Hex, WalletClient } from "viem";
import { _getChainSpecificConstants } from "../constants.js";
import { MissingEOAWalletError, writeContractOrThrow } from "../errors.js";
import { ESIMWallet } from "../../abis/index.js";
import { DataBundleDetails } from "../../types.js";

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
 */
export const _buyDataBundleWithToken = async (
    client: WalletClient,
    eSIMWalletAddress: Address,
    dataBundleDetails: DataBundleDetails,
    asset: Hex,
    maxAmountIn: bigint,
    paymentReference: Hex
) => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    if (!client.account) throw new MissingEOAWalletError();

    return writeContractOrThrow(client, {
        address: eSIMWalletAddress,
        chain: values.chain,
        account: client.account.address,
        abi: ESIMWallet,
        functionName: 'buyDataBundleWithToken',
        args: [dataBundleDetails, asset, maxAmountIn, paymentReference]
    });
}
