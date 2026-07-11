import { Address, WalletClient } from "viem";
import { _getChainSpecificConstants } from "../constants.js";
import { MissingEOAWalletError } from "../errors.js";
import { ESIMWalletFactory } from "../../abis/index.js";

/**
 * Admin-EOA logic for `ESIMWalletFactory`. Both functions are owner-gated
 * (`addRegistryAddress` requires `msg.sender == owner()`, `updateESIMWalletImplementation`
 * is `onlyOwner`), so the `client` must carry the `upgradeManager` EOA.
 *
 * Note: `ESIMWalletFactory.deployESIMWallet` is intentionally NOT exposed — it is
 * `onlyRegistryOrDeviceWalletFactoryOrDeviceWallet`, so a bare EOA always reverts.
 */

/** One-time wiring of the registry into the eSIM factory. Owner only. */
export const _addRegistryAddress = async (client: WalletClient, registryContractAddress: Address) => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    if (!client.account) throw new MissingEOAWalletError();

    return client.writeContract({
        address: values.factoryAddresses.ESIM_WALLET_FACTORY,
        chain: values.chain,
        account: client.account.address,
        abi: ESIMWalletFactory,
        functionName: 'addRegistryAddress',
        args: [registryContractAddress]
    });
}

/** Point the eSIM-wallet beacon at a new implementation. `onlyOwner`. */
export const _updateESIMWalletImplementation = async (client: WalletClient, eSIMWalletImpl: Address) => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    if (!client.account) throw new MissingEOAWalletError();

    return client.writeContract({
        address: values.factoryAddresses.ESIM_WALLET_FACTORY,
        chain: values.chain,
        account: client.account.address,
        abi: ESIMWalletFactory,
        functionName: 'updateESIMWalletImplementation',
        args: [eSIMWalletImpl]
    });
}
