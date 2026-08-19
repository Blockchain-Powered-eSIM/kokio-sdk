import { WalletClient, publicActions } from "viem";
import { _getChainSpecificConstants } from "../../constants.js";
import { LazyWalletRegistry } from "../../../abis/index.js";
import { DataBundleDetails } from "../../../types.js";

// Read-only admin logic for `LazyWalletRegistry` - its public storage getters,
// surfaced for the backend's fiat/lazy provisioning flows. Each read extends the
// `WalletClient` with `publicActions`; no EOA account is required.
//
// Note: `deviceIdentifierToESIMDetails` and
// `eSIMIdentifiersAssociatedWithDeviceIdentifier` back dynamic arrays on chain,
// so their auto-generated getters take an element `index` and return one entry -
// callers iterate indices to read the whole list (there is no full-array getter).

/** The upgrade-manager (owner) EOA of the lazy registry. */
export const _upgradeManager = async (client: WalletClient): Promise<`0x${string}`> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.LAZY_WALLET_REGISTRY,
        abi: LazyWalletRegistry,
        functionName: "upgradeManager",
        args: []
    }) as Promise<`0x${string}`>;
}

/** The device identifier an eSIM identifier is currently associated with. */
export const _eSIMIdentifierToDeviceIdentifier = async (client: WalletClient, eSIMIdentifier: string): Promise<string> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.LAZY_WALLET_REGISTRY,
        abi: LazyWalletRegistry,
        functionName: "eSIMIdentifierToDeviceIdentifier",
        args: [eSIMIdentifier]
    }) as Promise<string>;
}

/** One data-bundle history entry for a (device, eSIM) pair, by array index. */
export const _deviceIdentifierToESIMDetails = async (
    client: WalletClient,
    deviceIdentifier: string,
    eSIMIdentifier: string,
    index: bigint
): Promise<DataBundleDetails> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    const [dataBundleID, dataBundlePrice] = await client.extend(publicActions).readContract({
        address: values.factoryAddresses.LAZY_WALLET_REGISTRY,
        abi: LazyWalletRegistry,
        functionName: "deviceIdentifierToESIMDetails",
        args: [deviceIdentifier, eSIMIdentifier, index]
    }) as [string, bigint];

    return { dataBundleID, dataBundlePrice };
}

/** Most eSIM wallets one `deployLazyWalletAndSetESIMIdentifier` call will deploy. */
export const _maxESIMWalletsPerCall = async (client: WalletClient): Promise<bigint> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.LAZY_WALLET_REGISTRY,
        abi: LazyWalletRegistry,
        functionName: "MAX_ESIM_WALLETS_PER_CALL",
        args: []
    }) as Promise<bigint>;
}

/** Most history entries one `setHistoryForLazyWallet` call will copy. */
export const _maxHistoryEntriesPerCall = async (client: WalletClient): Promise<bigint> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.LAZY_WALLET_REGISTRY,
        abi: LazyWalletRegistry,
        functionName: "MAX_HISTORY_ENTRIES_PER_CALL",
        args: []
    }) as Promise<bigint>;
}

/**
 * How many of a device's eSIM wallets are already deployed. Non-zero exactly when
 * the lazy route ran the device's first batch, so it doubles as the marker for
 * the route itself.
 */
export const _eSIMWalletsDeployed = async (client: WalletClient, deviceIdentifier: string): Promise<bigint> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.LAZY_WALLET_REGISTRY,
        abi: LazyWalletRegistry,
        functionName: "eSIMWalletsDeployed",
        args: [deviceIdentifier]
    }) as Promise<bigint>;
}

/** Salt the device's first deployment batch started from. Every later batch derives from it. */
export const _lazyDeploymentSalt = async (client: WalletClient, deviceIdentifier: string): Promise<bigint> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.LAZY_WALLET_REGISTRY,
        abi: LazyWalletRegistry,
        functionName: "lazyDeploymentSalt",
        args: [deviceIdentifier]
    }) as Promise<bigint>;
}

/**
 * The eSIM wallet this registry deployed for an identifier. Zero for anything it
 * did not deploy, which is what authorises the history copy.
 */
export const _lazyDeployedESIMWallet = async (client: WalletClient, eSIMIdentifier: string): Promise<`0x${string}`> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.LAZY_WALLET_REGISTRY,
        abi: LazyWalletRegistry,
        functionName: "lazyDeployedESIMWallet",
        args: [eSIMIdentifier]
    }) as Promise<`0x${string}`>;
}

/** How many of an eSIM's stored purchase entries have already reached its wallet. */
export const _historyEntriesCopied = async (client: WalletClient, eSIMIdentifier: string): Promise<bigint> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.LAZY_WALLET_REGISTRY,
        abi: LazyWalletRegistry,
        functionName: "historyEntriesCopied",
        args: [eSIMIdentifier]
    }) as Promise<bigint>;
}

/** Whether a device identifier has purchases recorded against it here. */
export const _isDeviceIdentifierReserved = async (client: WalletClient, deviceIdentifier: string): Promise<boolean> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.LAZY_WALLET_REGISTRY,
        abi: LazyWalletRegistry,
        functionName: "isDeviceIdentifierReserved",
        args: [deviceIdentifier]
    }) as Promise<boolean>;
}

/** Whether an eSIM identifier is bound to a device here. */
export const _isESIMIdentifierReserved = async (client: WalletClient, eSIMIdentifier: string): Promise<boolean> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.LAZY_WALLET_REGISTRY,
        abi: LazyWalletRegistry,
        functionName: "isESIMIdentifierReserved",
        args: [eSIMIdentifier]
    }) as Promise<boolean>;
}

/** One eSIM identifier associated with a device identifier, by array index. */
export const _eSIMIdentifiersAssociatedWithDeviceIdentifier = async (
    client: WalletClient,
    deviceIdentifier: string,
    index: bigint
): Promise<string> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.LAZY_WALLET_REGISTRY,
        abi: LazyWalletRegistry,
        functionName: "eSIMIdentifiersAssociatedWithDeviceIdentifier",
        args: [deviceIdentifier, index]
    }) as Promise<string>;
}
