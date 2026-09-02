import { Address, Hex, WalletClient, publicActions } from "viem";
import { DeviceWallet } from "../../../abis/index.js";
import { P256Key } from "../../../types.js";

// Read-only admin logic targeting a specific `DeviceWallet` instance (its address
// is passed in). Surfaces the instance's public storage getters + `getVaultAddress`
// view for the backend. Each read extends the `WalletClient` with `publicActions`;
// no EOA account is required, and the target is the instance address (not a
// factory address, so no chain-constants lookup is needed).

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
export const _canPullFunds = async (client: WalletClient, deviceWalletAddress: Address, eSIMWallet: Address): Promise<boolean> => {

    return client.extend(publicActions).readContract({
        address: deviceWalletAddress,
        abi: DeviceWallet,
        functionName: "canPullFunds",
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

/**
 * The P256 key that owns this wallet, as its X and Y co-ordinates. Two reads,
 * because the contract stores the pair as an array and Solidity gives an indexed
 * getter rather than one returning both.
 */
export const _getOwner = async (client: WalletClient, deviceWalletAddress: Address): Promise<P256Key> => {

    const publicClient = client.extend(publicActions);
    const read = (index: bigint) => publicClient.readContract({
        address: deviceWalletAddress,
        abi: DeviceWallet,
        functionName: "owner",
        args: [index]
    }) as Promise<Hex>;

    return Promise.all([read(0n), read(1n)]);
}

/** Gas this wallet has on deposit at the EntryPoint. */
export const _getDeposit = async (client: WalletClient, deviceWalletAddress: Address): Promise<bigint> => {

    return client.extend(publicActions).readContract({
        address: deviceWalletAddress,
        abi: DeviceWallet,
        functionName: "getDeposit",
        args: []
    }) as Promise<bigint>;
}

/**
 * Check a signature over an arbitrary message, per ERC-1271. Returns `0x1626ba7e`
 * when the signature is valid and unexpired, `0xffffffff` otherwise.
 *
 * The signature is a version byte, then six bytes of `validUntil`, then the
 * ABI-encoded WebAuthn assertion. What was signed is an EIP-191 digest over
 * version, validUntil, chain id, the wallet address and `messageHash`, not
 * `messageHash` on its own.
 */
export const _isValidSignature = async (client: WalletClient, deviceWalletAddress: Address, messageHash: Hex, signature: Hex): Promise<Hex> => {

    return client.extend(publicActions).readContract({
        address: deviceWalletAddress,
        abi: DeviceWallet,
        functionName: "isValidSignature",
        args: [messageHash, signature]
    }) as Promise<Hex>;
}

/** The registry this wallet reports its ownership changes to. */
export const _registry = async (client: WalletClient, deviceWalletAddress: Address): Promise<Address> => {

    return client.extend(publicActions).readContract({
        address: deviceWalletAddress,
        abi: DeviceWallet,
        functionName: "registry",
        args: []
    }) as Promise<Address>;
}

/** The factory that deploys this wallet's eSIM wallets. */
export const _eSIMWalletFactory = async (client: WalletClient, deviceWalletAddress: Address): Promise<Address> => {

    return client.extend(publicActions).readContract({
        address: deviceWalletAddress,
        abi: DeviceWallet,
        functionName: "eSIMWalletFactory",
        args: []
    }) as Promise<Address>;
}

/** The ERC-4337 EntryPoint this wallet answers to. Immutable. */
export const _entryPoint = async (client: WalletClient, deviceWalletAddress: Address): Promise<Address> => {

    return client.extend(publicActions).readContract({
        address: deviceWalletAddress,
        abi: DeviceWallet,
        functionName: "entryPoint",
        args: []
    }) as Promise<Address>;
}

/** The P256 verifier used when the RIP-7212 precompile is unavailable. */
export const _verifier = async (client: WalletClient, deviceWalletAddress: Address): Promise<Address> => {

    return client.extend(publicActions).readContract({
        address: deviceWalletAddress,
        abi: DeviceWallet,
        functionName: "verifier",
        args: []
    }) as Promise<Address>;
}
