import { WalletClient, publicActions } from "viem";
import { _getChainSpecificConstants } from "../constants.js";
import { LazyWalletRegistry } from "../../abis/index.js";
import { DataBundleDetails } from "../../types.js";

/**
 * Read-only admin logic for `LazyWalletRegistry` — its public storage getters,
 * surfaced for the backend's fiat/lazy provisioning flows. Each read extends the
 * `WalletClient` with `publicActions`; no EOA account is required.
 *
 * Note: `deviceIdentifierToESIMDetails` and
 * `eSIMIdentifiersAssociatedWithDeviceIdentifier` back dynamic arrays on chain,
 * so their auto-generated getters take an element `index` and return one entry —
 * callers iterate indices to read the whole list (there is no full-array getter).
 */

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
