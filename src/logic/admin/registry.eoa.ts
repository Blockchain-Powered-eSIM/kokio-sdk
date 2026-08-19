import { Address, WalletClient } from "viem";
import { _getChainSpecificConstants } from "../constants.js";
import { MissingEOAWalletError } from "../errors.js";
import { Registry } from "../../abis/index.js";

// Admin-EOA logic for `Registry`. Most of this is `onlyOwner`, so the `client`
// must carry the owner EOA. `_acceptAdminUpdate` is the nominee's own call and
// `_assignESIMIdentifier` is `onlyESIMWalletAdmin`.
//
// On the live deployment the owner is the `ProtocolAdmin` timelock, not an EOA,
// so an `onlyOwner` call sent directly reverts. Route those through
// `protocolAdmin.proposer.schedule` instead. The direct path stays for
// deployments whose owner is a plain EOA or multisig.

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
 * Suspend the admin's powers protocol-wide. `onlyOwner`.
 *
 * The address stays on the books as `adminOfRecord`, so lifting the suspension
 * does not need it supplied again. Reverts if the admin is already suspended,
 * rather than passing quietly and leaving the caller believing it acted.
 */
export const _disableAdmin = async (client: WalletClient) => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    if (!client.account) throw new MissingEOAWalletError();

    return client.writeContract({
        address: values.factoryAddresses.REGISTRY,
        chain: values.chain,
        account: client.account.address,
        abi: Registry,
        functionName: 'disableAdmin',
        args: []
    });
}

/**
 * Give the suspended admin its powers back. `onlyOwner`.
 *
 * Does nothing about an outstanding nomination, which keeps the incumbent
 * powerless on its own. Withdraw that with `_requestAdminUpdate` naming the
 * incumbent. Reverts if the admin was never suspended.
 */
export const _enableAdmin = async (client: WalletClient) => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    if (!client.account) throw new MissingEOAWalletError();

    return client.writeContract({
        address: values.factoryAddresses.REGISTRY,
        chain: values.chain,
        account: client.account.address,
        abi: Registry,
        functionName: 'enableAdmin',
        args: []
    });
}

/**
 * Stop the ETH-moving paths on every device wallet and eSIM wallet.
 * `onlyESIMWalletAdmin`, so this is the one emergency lever the backend key can
 * pull on its own.
 *
 * It cannot release it again: `_unpause` is `onlyOwner`. That split is what stops
 * a compromised backend key holding user funds. Owners can still spend their own
 * ETH through their device wallet's `execute`, which a pause never reaches.
 */
export const _pause = async (client: WalletClient) => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    if (!client.account) throw new MissingEOAWalletError();

    return client.writeContract({
        address: values.factoryAddresses.REGISTRY,
        chain: values.chain,
        account: client.account.address,
        abi: Registry,
        functionName: 'pause',
        args: []
    });
}

/**
 * Release the pause. `onlyOwner`, not the admin, see `_pause`.
 *
 * On the live deployment the owner is the timelock, so this reverts from an EOA.
 * Schedule `protocolAdmin.unpauseCall` instead, or have a guardian call
 * `unpauseInstantly` if the wait is not acceptable.
 */
export const _unpause = async (client: WalletClient) => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    if (!client.account) throw new MissingEOAWalletError();

    return client.writeContract({
        address: values.factoryAddresses.REGISTRY,
        chain: values.chain,
        account: client.account.address,
        abi: Registry,
        functionName: 'unpause',
        args: []
    });
}

/**
 * Set the price ceiling every eSIM wallet falls back to when it holds none of its
 * own. `onlyOwner`, deliberately not the admin: the admin names the price on
 * `buyDataBundle`, so it must not also be able to raise its own limit.
 *
 * Zero reverts `ZeroDataBundlePriceCap`, since a zero would read as "no ceiling"
 * for every wallet without one of its own.
 */
export const _setDefaultDataBundlePriceCap = async (client: WalletClient, cap: bigint) => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    if (!client.account) throw new MissingEOAWalletError();

    return client.writeContract({
        address: values.factoryAddresses.REGISTRY,
        chain: values.chain,
        account: client.account.address,
        abi: Registry,
        functionName: 'setDefaultDataBundlePriceCap',
        args: [cap]
    });
}

/**
 * Bind an eSIM's unique identifier to its wallet. `onlyESIMWalletAdmin`.
 *
 * The identifier is claimed protocol-wide, so a string already bound to another
 * wallet reverts rather than moving.
 */
export const _assignESIMIdentifier = async (
    client: WalletClient,
    eSIMWalletAddress: Address,
    eSIMUniqueIdentifier: string
) => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    if (!client.account) throw new MissingEOAWalletError();

    return client.writeContract({
        address: values.factoryAddresses.REGISTRY,
        chain: values.chain,
        account: client.account.address,
        abi: Registry,
        functionName: 'assignESIMIdentifier',
        args: [eSIMWalletAddress, eSIMUniqueIdentifier]
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
