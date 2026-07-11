import { Address, WalletClient } from "viem";
import { _getChainSpecificConstants } from "../constants.js";
import { MissingEOAWalletError } from "../errors.js";
import { Registry } from "../../abis/index.js";

/**
 * Admin-EOA logic for `Registry`. `addOrUpdateLazyWalletRegistryAddress` is
 * `onlyOwner`, so the `client` must carry the `upgradeManager` EOA.
 */

/** Wire (or rewire) the LazyWalletRegistry into the Registry. `onlyOwner`. */
export const _addOrUpdateLazyWalletRegistryAddress = async (client: WalletClient, lazyWalletRegistry: Address) => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    if (!client.account) throw new MissingEOAWalletError();

    return client.writeContract({
        address: values.factoryAddresses.REGISTRY,
        chain: values.chain,
        account: client.account.address,
        abi: Registry,
        functionName: 'addOrUpdateLazyWalletRegistryAddress',
        args: [lazyWalletRegistry]
    });
}
