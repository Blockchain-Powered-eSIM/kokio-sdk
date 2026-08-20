import { Address, Hex, WalletClient } from "viem";
import { _getChainSpecificConstants } from "../constants.js";
import { MissingEOAWalletError, writeContractOrThrow } from "../errors.js";
import { DeviceWalletFactory } from "../../abis/index.js";
import { OwnerCall, P256Key } from "../../types.js";

// Admin-EOA logic for `DeviceWalletFactory`.
//
// Every function here is `onlyAdmin` / `onlyAdminOrRegistry` / `onlyOwner` on
// chain, i.e. the caller must be the `eSIMWalletAdmin` (or `upgradeManager`)
// EOA - never a device-wallet userOp. They therefore live on the EOA surface
// (`KokioAdmin`) and use `writeContract`, mirroring `_createAccountWithEOA`
// (which is reused as-is from `../deviceWalletFactory.js`).
//
// On the live deployment the owner is the `ProtocolAdmin` timelock, not an EOA,
// so an `onlyOwner` call sent directly reverts. Route those through
// `protocolAdmin.proposer.schedule` instead. The direct path stays for
// deployments whose owner is a plain EOA or multisig.

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

    return writeContractOrThrow(client, {
        address: values.factoryAddresses.DEVICE_WALLET_FACTORY,
        chain: values.chain,
        account: client.account.address,
        abi: DeviceWalletFactory,
        functionName: 'deployDeviceWalletForUsers',
        args: [deviceUniqueIdentifiers, deviceWalletOwnersKey, salts, depositAmounts],
        value
    });
}

/**
 * Register a freshly created device wallet with the factory. `onlyAdminOrRegistry`.
 * The salt has to be the one the deploying `createAccount` used, since the
 * factory rederives the counterfactual address from it to check the wallet.
 */
export const _postCreateAccount = async (
    client: WalletClient,
    deviceWallet: Address,
    deviceUniqueIdentifier: string,
    deviceWalletOwnerKey: P256Key,
    salt: bigint
) => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    if (!client.account) throw new MissingEOAWalletError();

    return writeContractOrThrow(client, {
        address: values.factoryAddresses.DEVICE_WALLET_FACTORY,
        chain: values.chain,
        account: client.account.address,
        abi: DeviceWalletFactory,
        functionName: 'postCreateAccount',
        args: [deviceWallet, deviceUniqueIdentifier, deviceWalletOwnerKey, salt]
    });
}

/** One-time wiring of the registry into the factory. `onlyAdmin`. */
export const _addRegistryAddress = async (client: WalletClient, registryContractAddress: Address) => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    if (!client.account) throw new MissingEOAWalletError();

    return writeContractOrThrow(client, {
        address: values.factoryAddresses.DEVICE_WALLET_FACTORY,
        chain: values.chain,
        account: client.account.address,
        abi: DeviceWalletFactory,
        functionName: 'addRegistryAddress',
        args: [registryContractAddress]
    });
}

/** Point the device-wallet beacon at a new implementation. `onlyOwner` (upgradeManager). */
export const _updateDeviceWalletImplementation = async (client: WalletClient, newDeviceImpl: Address) => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    if (!client.account) throw new MissingEOAWalletError();

    return writeContractOrThrow(client, {
        address: values.factoryAddresses.DEVICE_WALLET_FACTORY,
        chain: values.chain,
        account: client.account.address,
        abi: DeviceWalletFactory,
        functionName: 'updateDeviceWalletImplementation',
        args: [newDeviceImpl]
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
 * it, so the new owner can move every deployed device wallet at once.
 */
export const _transferOwnershipCall = async (client: WalletClient, newOwner: Address): Promise<OwnerCall> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return {
        address: values.factoryAddresses.DEVICE_WALLET_FACTORY,
        abi: DeviceWalletFactory,
        functionName: 'transferOwnership',
        args: [newOwner],
    };
}

/**
 * Point the factory's own proxy at a new implementation. Builds
 * `upgradeToAndCall`. Pass the result to `schedule`.
 *
 * This does not touch deployed device wallets. They read their implementation
 * from the beacon, which moves through `updateDeviceWalletImplementation`
 * instead. Changing what the factory deploys next is a beacon update, not this.
 */
export const _upgradeCall = async (client: WalletClient, newImplementation: Address, data: Hex = '0x'): Promise<OwnerCall> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return {
        address: values.factoryAddresses.DEVICE_WALLET_FACTORY,
        abi: DeviceWalletFactory,
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

    return writeContractOrThrow(client, {
        address: values.factoryAddresses.DEVICE_WALLET_FACTORY,
        chain: values.chain,
        account: client.account.address,
        abi: DeviceWalletFactory,
        functionName: 'acceptOwnership',
        args: []
    });
}
