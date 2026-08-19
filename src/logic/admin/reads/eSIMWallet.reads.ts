import { Address, WalletClient, publicActions } from "viem";
import { ESIMWallet } from "../../../abis/index.js";

// Read-only admin logic targeting a specific `ESIMWallet` instance (its address
// is passed in). Surfaces the instance's public storage getters + `owner` view
// for the backend. Each read extends the `WalletClient` with `publicActions`; no
// EOA account is required.

/** The `ESIMWalletFactory` that deployed this eSIM wallet. */
export const _eSIMWalletFactory = async (client: WalletClient, eSIMWalletAddress: Address): Promise<Address> => {

    return client.extend(publicActions).readContract({
        address: eSIMWalletAddress,
        abi: ESIMWallet,
        functionName: "eSIMWalletFactory",
        args: []
    }) as Promise<Address>;
}

/** The eSIM's unique identifier string (empty until set by the admin). */
export const _eSIMUniqueIdentifier = async (client: WalletClient, eSIMWalletAddress: Address): Promise<string> => {

    return client.extend(publicActions).readContract({
        address: eSIMWalletAddress,
        abi: ESIMWallet,
        functionName: "eSIMUniqueIdentifier",
        args: []
    }) as Promise<string>;
}

/**
 * This wallet's own price ceiling in wei. Zero means it follows the registry's
 * `defaultDataBundlePriceCap` instead, which is the state a fresh wallet and a
 * newly handed-over wallet both start in. Worth reading before naming a price on
 * `buyDataBundle`, since a price over the ceiling reverts.
 */
export const _dataBundlePriceCap = async (client: WalletClient, eSIMWalletAddress: Address): Promise<bigint> => {

    return client.extend(publicActions).readContract({
        address: eSIMWalletAddress,
        abi: ESIMWallet,
        functionName: "dataBundlePriceCap",
        args: []
    }) as Promise<bigint>;
}

/** The pending owner proposed via `requestTransferOwnership` (zero if none). */
export const _newRequestedOwner = async (client: WalletClient, eSIMWalletAddress: Address): Promise<Address> => {

    return client.extend(publicActions).readContract({
        address: eSIMWalletAddress,
        abi: ESIMWallet,
        functionName: "newRequestedOwner",
        args: []
    }) as Promise<Address>;
}

/** The current owner (device wallet) of this eSIM wallet. */
export const _owner = async (client: WalletClient, eSIMWalletAddress: Address): Promise<Address> => {

    return client.extend(publicActions).readContract({
        address: eSIMWalletAddress,
        abi: ESIMWallet,
        functionName: "owner",
        args: []
    }) as Promise<Address>;
}
