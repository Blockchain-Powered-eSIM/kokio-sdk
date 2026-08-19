import { Address, Hex, WalletClient, publicActions } from "viem";
import { _getChainSpecificConstants } from "../../constants.js";
import { Registry } from "../../../abis/index.js";

// Read-only admin logic for `Registry` (which inherits `RegistryHelper`, so its
// ABI carries the helper mappings too). Surfaces the public storage getters for
// the backend. Each read extends the `WalletClient` with `publicActions`; no EOA
// account is required.

/**
 * The admin EOA (`eSIMWalletAdmin`) recorded in the registry. Reads zero while a
 * nomination is pending or the admin is suspended, which means the role is
 * dormant rather than unset.
 */
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

/**
 * The admin address on the books, which keeps naming a suspended admin so the
 * suspension can be lifted without supplying it again. Ask `_eSIMWalletAdmin`
 * who may actually act.
 */
export const _adminOfRecord = async (client: WalletClient): Promise<Address> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "adminOfRecord",
        args: []
    }) as Promise<Address>;
}

/**
 * Whether the admin's powers are suspended protocol-wide. True and a pending
 * nomination are separate reasons for `_eSIMWalletAdmin` to read zero, so read
 * this alongside `_newRequestedAdmin` to tell them apart.
 */
export const _adminDisabled = async (client: WalletClient): Promise<boolean> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "adminDisabled",
        args: []
    }) as Promise<boolean>;
}

/**
 * Whether the protocol is paused. While true, every ETH-moving path on the
 * device wallets and eSIM wallets reverts `ProtocolPaused`.
 */
export const _paused = async (client: WalletClient): Promise<boolean> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "paused",
        args: []
    }) as Promise<boolean>;
}

/**
 * The fallback price ceiling in wei, applied to any eSIM wallet holding no cap of
 * its own. Never zero.
 */
export const _defaultDataBundlePriceCap = async (client: WalletClient): Promise<bigint> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "defaultDataBundlePriceCap",
        args: []
    }) as Promise<bigint>;
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

/** The pending admin nominated via `requestAdminUpdate` (zero address if none). */
export const _newRequestedAdmin = async (client: WalletClient): Promise<Address> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "newRequestedAdmin",
        args: []
    }) as Promise<Address>;
}

/**
 * Who holds `onlyOwner` on the registry. On the live deployment this is the
 * `ProtocolAdmin` timelock, so an owner call sent from an EOA reverts and has to
 * be scheduled instead.
 */
export const _owner = async (client: WalletClient): Promise<Address> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "owner",
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
