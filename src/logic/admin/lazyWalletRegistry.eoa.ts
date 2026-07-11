import { WalletClient } from "viem";
import { _getChainSpecificConstants } from "../constants.js";
import { MissingEOAWalletError } from "../errors.js";
import { LazyWalletRegistry } from "../../abis/index.js";
import { DataBundleDetails, P256Key } from "../../types.js";

/**
 * Admin-EOA logic for `LazyWalletRegistry`. All three functions are
 * `onlyESIMWalletAdmin` on chain, so they can only succeed from the admin EOA —
 * a device-wallet userOp (whose sender is the smart account) always reverts.
 * This is why they belong on the EOA surface rather than the mobile userOp one.
 */

/** Record fiat/lazy purchase history for a batch of devices. `onlyESIMWalletAdmin`. */
export const _batchPopulateHistory = async (
    client: WalletClient,
    deviceUniqueIdentifiers: Array<string>,
    eSIMUniqueIdentifiers: Array<Array<string>>,
    dataBundleDetails: Array<Array<DataBundleDetails>>
) => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    if (!client.account) throw new MissingEOAWalletError();

    return client.writeContract({
        address: values.factoryAddresses.LAZY_WALLET_REGISTRY,
        chain: values.chain,
        account: client.account.address,
        abi: LazyWalletRegistry,
        functionName: 'batchPopulateHistory',
        args: [deviceUniqueIdentifiers, eSIMUniqueIdentifiers, dataBundleDetails]
    });
}

/**
 * Materialise a lazily-provisioned device wallet and its eSIMs on chain.
 * `onlyESIMWalletAdmin`, `payable`: the contract requires `depositAmount == msg.value`,
 * so `value` is set to `depositAmount` here.
 */
export const _deployLazyWalletAndSetESIMIdentifier = async (
    client: WalletClient,
    deviceOwnerPublicKey: P256Key,
    deviceUniqueIdentifier: string,
    salt: bigint,
    depositAmount: bigint
) => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    if (!client.account) throw new MissingEOAWalletError();

    return client.writeContract({
        address: values.factoryAddresses.LAZY_WALLET_REGISTRY,
        chain: values.chain,
        account: client.account.address,
        abi: LazyWalletRegistry,
        functionName: 'deployLazyWalletAndSetESIMIdentifier',
        args: [deviceOwnerPublicKey, deviceUniqueIdentifier, salt, depositAmount],
        value: depositAmount
    });
}

/** Re-point an eSIM identifier from an old device to a new one. `onlyESIMWalletAdmin`. */
export const _switchESIMIdentifierToNewDeviceIdentifier = async (
    client: WalletClient,
    eSIMIdentifier: string,
    oldDeviceIdentifier: string,
    newDeviceIdentifier: string
) => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    if (!client.account) throw new MissingEOAWalletError();

    return client.writeContract({
        address: values.factoryAddresses.LAZY_WALLET_REGISTRY,
        chain: values.chain,
        account: client.account.address,
        abi: LazyWalletRegistry,
        functionName: 'switchESIMIdentifierToNewDeviceIdentifier',
        args: [eSIMIdentifier, oldDeviceIdentifier, newDeviceIdentifier]
    });
}
