import { Address, WalletClient } from "viem";
import { _getChainSpecificConstants } from "../constants.js";
import { MissingEOAWalletError } from "../errors.js";
import { DeviceWalletFactory } from "../../abis/index.js";
import { P256Key } from "../../types.js";

/**
 * Admin-EOA logic for `DeviceWalletFactory`.
 *
 * Every function here is `onlyAdmin` / `onlyAdminOrRegistry` / `onlyOwner` on
 * chain, i.e. the caller must be the `eSIMWalletAdmin` (or `upgradeManager`)
 * EOA — never a device-wallet userOp. They therefore live on the EOA surface
 * (`KokioAdmin`) and use `writeContract`, mirroring `_createAccountWithEOA`
 * (which is reused as-is from `../deviceWalletFactory.js`).
 */

/**
 * Batch-deploy device wallets for lazy/fiat users. `onlyAdminOrRegistry`,
 * `payable`: `value` is the total ETH pot from which each `depositAmounts[i]`
 * is drawn; any surplus is refunded to the caller on chain.
 */
export const _deployDeviceWalletForUsers = async (
    client: WalletClient,
    deviceUniqueIdentifiers: Array<string>,
    deviceWalletOwnersKey: Array<P256Key>,
    salts: Array<bigint>,
    depositAmounts: Array<bigint>,
    value: bigint
) => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    if (!client.account) throw new MissingEOAWalletError();

    return client.writeContract({
        address: values.factoryAddresses.DEVICE_WALLET_FACTORY,
        chain: values.chain,
        account: client.account.address,
        abi: DeviceWalletFactory,
        functionName: 'deployDeviceWalletForUsers',
        args: [deviceUniqueIdentifiers, deviceWalletOwnersKey, salts, depositAmounts],
        value
    });
}

/** Register a freshly created device wallet with the factory. `onlyAdminOrRegistry`. */
export const _postCreateAccount = async (
    client: WalletClient,
    deviceWallet: Address,
    deviceUniqueIdentifier: string,
    deviceWalletOwnerKey: P256Key
) => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    if (!client.account) throw new MissingEOAWalletError();

    return client.writeContract({
        address: values.factoryAddresses.DEVICE_WALLET_FACTORY,
        chain: values.chain,
        account: client.account.address,
        abi: DeviceWalletFactory,
        functionName: 'postCreateAccount',
        args: [deviceWallet, deviceUniqueIdentifier, deviceWalletOwnerKey]
    });
}

/** One-time wiring of the registry into the factory. `onlyAdmin`. */
export const _addRegistryAddress = async (client: WalletClient, registryContractAddress: Address) => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    if (!client.account) throw new MissingEOAWalletError();

    return client.writeContract({
        address: values.factoryAddresses.DEVICE_WALLET_FACTORY,
        chain: values.chain,
        account: client.account.address,
        abi: DeviceWalletFactory,
        functionName: 'addRegistryAddress',
        args: [registryContractAddress]
    });
}

/** Update the vault that receives eSIM payments. `onlyAdmin`. */
export const _updateVaultAddress = async (client: WalletClient, newVaultAddress: Address) => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    if (!client.account) throw new MissingEOAWalletError();

    return client.writeContract({
        address: values.factoryAddresses.DEVICE_WALLET_FACTORY,
        chain: values.chain,
        account: client.account.address,
        abi: DeviceWalletFactory,
        functionName: 'updateVaultAddress',
        args: [newVaultAddress]
    });
}

/** Step 1 of the 2-step admin handover: propose a new admin. `onlyAdmin`. */
export const _requestAdminUpdate = async (client: WalletClient, newAdmin: Address) => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    if (!client.account) throw new MissingEOAWalletError();

    return client.writeContract({
        address: values.factoryAddresses.DEVICE_WALLET_FACTORY,
        chain: values.chain,
        account: client.account.address,
        abi: DeviceWalletFactory,
        functionName: 'requestAdminUpdate',
        args: [newAdmin]
    });
}

/**
 * Step 2 of the 2-step admin handover: the proposed admin accepts. The chain
 * requires `msg.sender` to equal the pending admin, so the `client` here must
 * be the newly proposed admin EOA.
 */
export const _acceptAdminUpdate = async (client: WalletClient) => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    if (!client.account) throw new MissingEOAWalletError();

    return client.writeContract({
        address: values.factoryAddresses.DEVICE_WALLET_FACTORY,
        chain: values.chain,
        account: client.account.address,
        abi: DeviceWalletFactory,
        functionName: 'acceptAdminUpdate',
        args: []
    });
}

/** Point the device-wallet beacon at a new implementation. `onlyOwner` (upgradeManager). */
export const _updateDeviceWalletImplementation = async (client: WalletClient, newDeviceImpl: Address) => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    if (!client.account) throw new MissingEOAWalletError();

    return client.writeContract({
        address: values.factoryAddresses.DEVICE_WALLET_FACTORY,
        chain: values.chain,
        account: client.account.address,
        abi: DeviceWalletFactory,
        functionName: 'updateDeviceWalletImplementation',
        args: [newDeviceImpl]
    });
}
