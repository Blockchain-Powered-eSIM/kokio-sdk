import { Address, WalletClient, publicActions } from "viem";
import { DeviceWallet } from "../../../abis/index.js";

/**
 * Read-only admin logic targeting a specific `DeviceWallet` instance (its address
 * is passed in). Surfaces the instance's public storage getters + `getVaultAddress`
 * view for the backend. Each read extends the `WalletClient` with `publicActions`;
 * no EOA account is required, and the target is the instance address (not a
 * factory address, so no chain-constants lookup is needed).
 */

/** The device's unique identifier string. */
export const _deviceUniqueIdentifier = async (client: WalletClient, deviceWalletAddress: Address): Promise<string> => {

    return client.extend(publicActions).readContract({
        address: deviceWalletAddress,
        abi: DeviceWallet,
        functionName: "deviceUniqueIdentifier",
        args: []
    }) as Promise<string>;
}

/** Whether an eSIM wallet is a valid child of this device wallet. */
export const _isValidESIMWallet = async (client: WalletClient, deviceWalletAddress: Address, eSIMWallet: Address): Promise<boolean> => {

    return client.extend(publicActions).readContract({
        address: deviceWalletAddress,
        abi: DeviceWallet,
        functionName: "isValidESIMWallet",
        args: [eSIMWallet]
    }) as Promise<boolean>;
}

/** Whether an eSIM wallet is allowed to pull ETH from this device wallet. */
export const _canPullETH = async (client: WalletClient, deviceWalletAddress: Address, eSIMWallet: Address): Promise<boolean> => {

    return client.extend(publicActions).readContract({
        address: deviceWalletAddress,
        abi: DeviceWallet,
        functionName: "canPullETH",
        args: [eSIMWallet]
    }) as Promise<boolean>;
}

/** The vault address this device wallet pays eSIM purchases to. */
export const _getVaultAddress = async (client: WalletClient, deviceWalletAddress: Address): Promise<Address> => {

    return client.extend(publicActions).readContract({
        address: deviceWalletAddress,
        abi: DeviceWallet,
        functionName: "getVaultAddress",
        args: []
    }) as Promise<Address>;
}
