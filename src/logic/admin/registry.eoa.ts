import { Address, WalletClient } from "viem";
import { _getChainSpecificConstants } from "../constants.js";
import { MissingEOAWalletError } from "../errors.js";
import { Registry } from "../../abis/index.js";

/**
 * Admin-EOA logic for `Registry`. Everything here except `_acceptAdminUpdate` is
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

/** Update the vault that receives eSIM payments. `onlyOwner`. */
export const _updateVaultAddress = async (client: WalletClient, newVaultAddress: Address) => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    if (!client.account) throw new MissingEOAWalletError();

    return client.writeContract({
        address: values.factoryAddresses.REGISTRY,
        chain: values.chain,
        account: client.account.address,
        abi: Registry,
        functionName: 'updateVaultAddress',
        args: [newVaultAddress]
    });
}

/**
 * Step 1 of the 2-step admin handover: nominate the next admin. `onlyOwner`, so
 * the `client` is the owner EOA, not the outgoing admin.
 *
 * The nomination takes the role off the incumbent straight away: `eSIMWalletAdmin`
 * reads zero until the nominee accepts, and every admin gated call across the
 * protocol reverts in that window. Send the two steps close together. Naming the
 * incumbent instead withdraws a pending nomination and hands the role back.
 */
export const _requestAdminUpdate = async (client: WalletClient, newAdmin: Address) => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    if (!client.account) throw new MissingEOAWalletError();

    return client.writeContract({
        address: values.factoryAddresses.REGISTRY,
        chain: values.chain,
        account: client.account.address,
        abi: Registry,
        functionName: 'requestAdminUpdate',
        args: [newAdmin]
    });
}

/**
 * Step 2 of the 2-step admin handover: the nominee accepts. The chain requires
 * `msg.sender` to equal the pending admin, so the `client` here must be the
 * newly nominated admin EOA.
 */
export const _acceptAdminUpdate = async (client: WalletClient) => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    if (!client.account) throw new MissingEOAWalletError();

    return client.writeContract({
        address: values.factoryAddresses.REGISTRY,
        chain: values.chain,
        account: client.account.address,
        abi: Registry,
        functionName: 'acceptAdminUpdate',
        args: []
    });
}
