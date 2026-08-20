import { Address, Hex, WalletClient } from "viem";
import { _getChainSpecificConstants } from "../constants.js";
import { MissingEOAWalletError } from "../errors.js";
import { ESIMWalletFactory } from "../../abis/index.js";
import type { OwnerCall } from "../../types.js";

// Admin-EOA logic for `ESIMWalletFactory`. Both functions are owner-gated
// (`addRegistryAddress` requires `msg.sender == owner()`, `updateESIMWalletImplementation`
// is `onlyOwner`), so the `client` must carry the `upgradeManager` EOA.
//
// On the live deployment the owner is the `ProtocolAdmin` timelock, not an EOA,
// so either call sent directly reverts. Route them through
// `protocolAdmin.proposer.schedule` instead. The direct path stays for
// deployments whose owner is a plain EOA or multisig.
//
// Note: `ESIMWalletFactory.deployESIMWallet` is intentionally NOT exposed - it is
// `onlyRegistryOrDeviceWalletFactoryOrDeviceWallet`, so a bare EOA always reverts.

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

// ---------------------------------------------------------------------------
// Owner payloads - only reachable through schedule
// ---------------------------------------------------------------------------

// Both are `onlyOwner`, and on the live deployment the owner is the timelock, so
// they exist as something to schedule rather than to send. Each returns the
// `OwnerCall` to hand to `protocolAdmin.schedule`.

/**
 * Offer ownership to a new address. Pass the result to `schedule`.
 *
 * Ownable2Step, so the offer changes nothing until the named address calls
 * `acceptOwnership`. Note this hands over the beacon too, since the factory owns
 * it, so the new owner can move every deployed eSIM wallet at once.
 */
export const _transferOwnershipCall = async (client: WalletClient, newOwner: Address): Promise<OwnerCall> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return {
        address: values.factoryAddresses.ESIM_WALLET_FACTORY,
        abi: ESIMWalletFactory,
        functionName: 'transferOwnership',
        args: [newOwner],
    };
}

/**
 * Point the factory's own proxy at a new implementation. Builds
 * `upgradeToAndCall`. Pass the result to `schedule`.
 *
 * This does not touch deployed eSIM wallets. They read their implementation from
 * the beacon, which moves through `updateESIMWalletImplementation` instead.
 */
export const _upgradeCall = async (client: WalletClient, newImplementation: Address, data: Hex = '0x'): Promise<OwnerCall> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return {
        address: values.factoryAddresses.ESIM_WALLET_FACTORY,
        abi: ESIMWalletFactory,
        functionName: 'upgradeToAndCall',
        args: [newImplementation, data],
    };
}

/**
 * Take ownership after a `transferOwnership` named this client. `msg.sender`
 * must equal `pendingOwner`, so the `client` is the incoming owner.
 *
 * Where the incoming owner is the timelock, use
 * `protocolAdmin.acceptOwnershipBatch` instead, which accepts for every contract
 * at once.
 */
export const _acceptOwnership = async (client: WalletClient) => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    if (!client.account) throw new MissingEOAWalletError();

    return client.writeContract({
        address: values.factoryAddresses.ESIM_WALLET_FACTORY,
        chain: values.chain,
        account: client.account.address,
        abi: ESIMWalletFactory,
        functionName: 'acceptOwnership',
        args: []
    });
}
