import { Address, Hex, WalletClient } from "viem";
import { _getChainSpecificConstants } from "../constants.js";
import { MissingEOAWalletError, writeContractOrThrow } from "../errors.js";
import { PaymentAdapter } from "../../abis/index.js";
import type { Asset, OwnerCall } from "../../types.js";

// Admin-EOA logic for `PaymentAdapter`. `registerAsset`/`updateAsset` are
// `onlyOwner`, so the `client` must carry the `upgradeManager` EOA.
//
// On the live deployment the owner is the `ProtocolAdmin` timelock, not an EOA,
// so either call sent directly reverts. Route them through
// `protocolAdmin.proposer.schedule` instead, via the payload builders below.

/** Add a currency the adapter has never seen. Reverts if `_symbol` is already registered. Owner only. */
export const _registerAsset = async (client: WalletClient, symbol: Hex, asset: Asset) => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    if (!client.account) throw new MissingEOAWalletError();

    return writeContractOrThrow(client, {
        address: values.factoryAddresses.PAYMENT_ADAPTER,
        chain: values.chain,
        account: client.account.address,
        abi: PaymentAdapter,
        functionName: 'registerAsset',
        args: [symbol, asset]
    });
}

/** Change a currency already in the table (its decimals, token, or allowed flag). Owner only. */
export const _updateAsset = async (client: WalletClient, symbol: Hex, asset: Asset) => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    if (!client.account) throw new MissingEOAWalletError();

    return writeContractOrThrow(client, {
        address: values.factoryAddresses.PAYMENT_ADAPTER,
        chain: values.chain,
        account: client.account.address,
        abi: PaymentAdapter,
        functionName: 'updateAsset',
        args: [symbol, asset]
    });
}

// ---------------------------------------------------------------------------
// Owner payloads - only reachable through schedule
// ---------------------------------------------------------------------------

// All `onlyOwner`, and on the live deployment the owner is the timelock, so they
// exist as something to schedule rather than to send. Each returns the
// `OwnerCall` to hand to `protocolAdmin.schedule`.

/** Add or change a currency, scheduled through the timelock. Pass the result to `schedule`. */
export const _registerAssetCall = async (client: WalletClient, symbol: Hex, asset: Asset): Promise<OwnerCall> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return {
        address: values.factoryAddresses.PAYMENT_ADAPTER,
        abi: PaymentAdapter,
        functionName: 'registerAsset',
        args: [symbol, asset],
    };
}

/** Change a currency already in the table, scheduled through the timelock. Pass the result to `schedule`. */
export const _updateAssetCall = async (client: WalletClient, symbol: Hex, asset: Asset): Promise<OwnerCall> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return {
        address: values.factoryAddresses.PAYMENT_ADAPTER,
        abi: PaymentAdapter,
        functionName: 'updateAsset',
        args: [symbol, asset],
    };
}

/**
 * Offer ownership to a new address. Pass the result to `schedule`.
 *
 * Ownable2Step, so the offer changes nothing until the named address calls
 * `acceptOwnership`.
 */
export const _transferOwnershipCall = async (client: WalletClient, newOwner: Address): Promise<OwnerCall> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return {
        address: values.factoryAddresses.PAYMENT_ADAPTER,
        abi: PaymentAdapter,
        functionName: 'transferOwnership',
        args: [newOwner],
    };
}

/** Point the adapter's proxy at a new implementation. Builds `upgradeToAndCall`. Pass the result to `schedule`. */
export const _upgradeCall = async (client: WalletClient, newImplementation: Address, data: Hex = '0x'): Promise<OwnerCall> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return {
        address: values.factoryAddresses.PAYMENT_ADAPTER,
        abi: PaymentAdapter,
        functionName: 'upgradeToAndCall',
        args: [newImplementation, data],
    };
}

/**
 * Take ownership after a `transferOwnership` named this client. `msg.sender`
 * must equal `pendingOwner`, so the `client` is the incoming owner.
 *
 * Where the incoming owner is the timelock, use
 * `protocolAdmin.acceptOwnershipBatch` instead, which accepts for every
 * contract at once.
 */
export const _acceptOwnership = async (client: WalletClient) => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    if (!client.account) throw new MissingEOAWalletError();

    return writeContractOrThrow(client, {
        address: values.factoryAddresses.PAYMENT_ADAPTER,
        chain: values.chain,
        account: client.account.address,
        abi: PaymentAdapter,
        functionName: 'acceptOwnership',
        args: []
    });
}
