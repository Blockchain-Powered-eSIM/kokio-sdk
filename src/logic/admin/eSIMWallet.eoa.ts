import { Address, WalletClient } from "viem";
import { _getChainSpecificConstants } from "../constants.js";
import { MissingEOAWalletError } from "../errors.js";
import { ESIMWallet } from "../../abis/index.js";
import { DataBundleDetails } from "../../types.js";

/**
 * Admin-EOA logic targeting a specific `ESIMWallet` instance (address passed in).
 * `buyDataBundle` is `onlyDeviceWalletOrESIMWalletAdmin`, so the admin EOA can
 * call it directly.
 */

/**
 * Buy a data bundle for an eSIM wallet. `onlyDeviceWalletOrESIMWalletAdmin`,
 * `payable`. `value` is optional: the contract pulls any shortfall from the
 * device wallet's balance, so an admin can pass `0n` when the wallet is funded,
 * or forward `dataBundlePrice` to pay directly.
 */
export const _buyDataBundle = async (
    client: WalletClient,
    eSIMWalletAddress: Address,
    dataBundleDetails: DataBundleDetails,
    value: bigint = 0n
) => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    if (!client.account) throw new MissingEOAWalletError();

    return client.writeContract({
        address: eSIMWalletAddress,
        chain: values.chain,
        account: client.account.address,
        abi: ESIMWallet,
        functionName: 'buyDataBundle',
        args: [dataBundleDetails],
        value
    });
}
