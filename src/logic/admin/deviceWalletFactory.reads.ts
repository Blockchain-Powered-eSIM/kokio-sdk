import { Address, WalletClient, publicActions } from "viem";
import { _getChainSpecificConstants } from "../constants.js";
import { DeviceWalletFactory } from "../../abis/index.js";
import { P256Key } from "../../types.js";

/**
 * Read-only admin logic for `DeviceWalletFactory` — the contract's public
 * storage getters and `view` functions, surfaced for the backend.
 *
 * A viem `WalletClient` carries no public actions, so each read extends it with
 * `publicActions` (reusing the same transport, so it also works under an anvil
 * fork) before calling `readContract`. Reads need no EOA account, so there is no
 * `MissingEOAWalletError` guard.
 */

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

/** The vault EOA that receives eSIM payments. */
export const _vault = async (client: WalletClient): Promise<Address> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.DEVICE_WALLET_FACTORY,
        abi: DeviceWalletFactory,
        functionName: "vault",
        args: []
    }) as Promise<Address>;
}

/** The pending admin proposed via `requestAdminUpdate` (zero address if none). */
export const _newRequestedAdmin = async (client: WalletClient): Promise<Address> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.DEVICE_WALLET_FACTORY,
        abi: DeviceWalletFactory,
        functionName: "newRequestedAdmin",
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
 * The counterfactual (CREATE2) device-wallet address for an owner key. On-chain
 * arg order is `(ownerKey, uid, salt)` — note this differs from `createAccount`.
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
