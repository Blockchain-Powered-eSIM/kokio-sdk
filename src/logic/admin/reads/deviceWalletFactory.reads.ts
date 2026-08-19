import { Address, WalletClient, publicActions } from "viem";
import { _getChainSpecificConstants } from "../../constants.js";
import { DeviceWalletFactory } from "../../../abis/index.js";
import { P256Key } from "../../../types.js";

// Read-only admin logic for `DeviceWalletFactory` - the contract's public
// storage getters and `view` functions, surfaced for the backend.
//
// A viem `WalletClient` carries no public actions, so each read extends it with
// `publicActions` (reusing the same transport, so it also works under an anvil
// fork) before calling `readContract`. Reads need no EOA account, so there is no
// `MissingEOAWalletError` guard.

/** The admin EOA (`eSIMWalletAdmin`) currently set on the factory. */
export const _eSIMWalletAdmin = async (client: WalletClient): Promise<Address> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.DEVICE_WALLET_FACTORY,
        abi: DeviceWalletFactory,
        functionName: "eSIMWalletAdmin",
        args: []
    }) as Promise<Address>;
}

/** Whether a device wallet has been registered with the factory. */
export const _deviceWalletInfoAdded = async (client: WalletClient, deviceWallet: Address): Promise<boolean> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.DEVICE_WALLET_FACTORY,
        abi: DeviceWalletFactory,
        functionName: "deviceWalletInfoAdded",
        args: [deviceWallet]
    }) as Promise<boolean>;
}

/** The current device-wallet beacon implementation. */
export const _getCurrentDeviceWalletImplementation = async (client: WalletClient): Promise<Address> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.DEVICE_WALLET_FACTORY,
        abi: DeviceWalletFactory,
        functionName: "getCurrentDeviceWalletImplementation",
        args: []
    }) as Promise<Address>;
}

/**
 * Check an identifier and owner key before deploying. Answers the zero address
 * when both are free, or the wallet already holding one of them.
 *
 * `createAccount` runs inside EntryPoint validation, where the 4337 rules bar it
 * from reading the registry, so it cannot see that an identifier or a key is
 * taken: it deploys a second wallet at a fresh address and the
 * `postCreateAccount` that would register it fails afterwards. Checking here
 * first is what stops that.
 *
 * Reverts on an empty identifier or a key that is not a point on the P256 curve.
 */
export const _preCreateAccountValidation = async (
    client: WalletClient,
    deviceUniqueIdentifier: string,
    deviceWalletOwnerKey: P256Key
): Promise<Address> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.DEVICE_WALLET_FACTORY,
        abi: DeviceWalletFactory,
        functionName: "preCreateAccountValidation",
        args: [deviceUniqueIdentifier, deviceWalletOwnerKey]
    }) as Promise<Address>;
}

// The factory's no-arg address getters differ only by name, so they share one body.
type AddressGetter = "beacon" | "registry" | "entryPoint" | "verifier" | "owner" | "pendingOwner";

const _addressGetter = async (client: WalletClient, functionName: AddressGetter): Promise<Address> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.DEVICE_WALLET_FACTORY,
        abi: DeviceWalletFactory,
        functionName,
        args: []
    }) as Promise<Address>;
}

/**
 * The beacon every device wallet reads its implementation from. One update moves
 * all of them and no wallet can decline it.
 */
export const _beacon = (client: WalletClient) => _addressGetter(client, "beacon");

/** The registry the factory writes new wallets into. */
export const _registry = (client: WalletClient) => _addressGetter(client, "registry");

/** The EntryPoint baked into every device wallet this factory deploys. */
export const _entryPoint = (client: WalletClient) => _addressGetter(client, "entryPoint");

/** The contract new device wallets verify WebAuthn assertions through. */
export const _verifier = (client: WalletClient) => _addressGetter(client, "verifier");

/**
 * Who holds `onlyOwner` on the factory. On the live deployment this is the
 * `ProtocolAdmin` timelock, so an owner call sent from an EOA reverts and has to
 * be scheduled instead.
 */
export const _owner = (client: WalletClient) => _addressGetter(client, "owner");

/**
 * The address a `transferOwnership` is waiting on. Worth reading before
 * `protocolAdmin.acceptOwnershipBatch`, which reverts on any target that has not
 * been offered to the timelock.
 */
export const _pendingOwner = (client: WalletClient) => _addressGetter(client, "pendingOwner");

/**
 * The counterfactual (CREATE2) device-wallet address for an owner key. On-chain
 * arg order is `(ownerKey, uid, salt)` - note this differs from `createAccount`.
 */
export const _getCounterFactualAddress = async (
    client: WalletClient,
    deviceWalletOwnerKey: P256Key,
    deviceUniqueIdentifier: string,
    salt: bigint
): Promise<Address> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.DEVICE_WALLET_FACTORY,
        abi: DeviceWalletFactory,
        functionName: "getCounterFactualAddress",
        args: [deviceWalletOwnerKey, deviceUniqueIdentifier, salt]
    }) as Promise<Address>;
}
