import { Address, Hex, WalletClient, publicActions } from "viem";
import { _getChainSpecificConstants } from "../constants.js";
import { Registry } from "../../abis/index.js";

/**
 * Read-only admin logic for `Registry` (which inherits `RegistryHelper`, so its
 * ABI carries the helper mappings too). Surfaces the public storage getters for
 * the backend. Each read extends the `WalletClient` with `publicActions`; no EOA
 * account is required.
 */

/** The admin EOA (`eSIMWalletAdmin`) recorded in the registry. */
export const _eSIMWalletAdmin = async (client: WalletClient): Promise<Address> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "eSIMWalletAdmin",
        args: []
    }) as Promise<Address>;
}

/** The vault EOA recorded in the registry. */
export const _vault = async (client: WalletClient): Promise<Address> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "vault",
        args: []
    }) as Promise<Address>;
}

/** The upgrade-manager (owner) EOA recorded in the registry. */
export const _upgradeManager = async (client: WalletClient): Promise<Address> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "upgradeManager",
        args: []
    }) as Promise<Address>;
}

/** The `LazyWalletRegistry` address wired into the registry. */
export const _lazyWalletRegistry = async (client: WalletClient): Promise<Address> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "lazyWalletRegistry",
        args: []
    }) as Promise<Address>;
}

/** The device wallet registered for a device unique identifier (zero if none). */
export const _uniqueIdentifierToDeviceWallet = async (client: WalletClient, deviceIdentifier: string): Promise<Address> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "uniqueIdentifierToDeviceWallet",
        args: [deviceIdentifier]
    }) as Promise<Address>;
}

/**
 * One of a device wallet's two P-256 owner keys. The on-chain getter for the
 * `bytes32[2]` array takes the element index (`0` or `1`) and returns one key.
 */
export const _deviceWalletToOwner = async (client: WalletClient, deviceWallet: Address, index: bigint): Promise<Hex> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "deviceWalletToOwner",
        args: [deviceWallet, index]
    }) as Promise<Hex>;
}

/** The device wallet registered for a hash of owner P-256 keys (zero if none). */
export const _registeredP256Keys = async (client: WalletClient, hashOfOwnerP256Keys: Hex): Promise<Address> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "registeredP256Keys",
        args: [hashOfOwnerP256Keys]
    }) as Promise<Address>;
}

/** Whether a device wallet is registered/valid. */
export const _isDeviceWalletValid = async (client: WalletClient, deviceWallet: Address): Promise<boolean> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "isDeviceWalletValid",
        args: [deviceWallet]
    }) as Promise<boolean>;
}

/**
 * The device wallet that owns an eSIM wallet (zero address if the eSIM is not
 * valid). On-chain this getter is named `isESIMWalletValid` but returns the
 * associated device-wallet address, not a boolean.
 */
export const _isESIMWalletValid = async (client: WalletClient, eSIMWallet: Address): Promise<Address> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "isESIMWalletValid",
        args: [eSIMWallet]
    }) as Promise<Address>;
}

/** Whether an eSIM wallet is currently on standby. */
export const _isESIMWalletOnStandby = async (client: WalletClient, eSIMWallet: Address): Promise<boolean> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "isESIMWalletOnStandby",
        args: [eSIMWallet]
    }) as Promise<boolean>;
}
