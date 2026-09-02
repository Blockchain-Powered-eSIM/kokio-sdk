import { Address, encodeFunctionData } from "viem";
import { _getChainSpecificConstants } from "./constants.js";
import { KokioSmartAccountClient } from "../types.js";
import { Registry } from "../abis/index.js";
import { MissingSmartWalletError } from "./errors.js";

// A userOp from a device wallet arrives at the registry with msg.sender set to the
// device wallet, which is what `onlyDeviceWallet` wants. Those three functions are
// the only writes this surface can reach; everything else is `onlyOwner`,
// `onlyESIMWalletAdmin`, `onlyDeviceWalletFactory` or `onlyLazyWalletRegistry` and
// lives on `KokioAdmin.registry` or behind the lazy registry wrappers.
//
// updateDeviceWalletOwnerKey is the exception among the three. It is
// `onlyDeviceWallet`, so a userOp reaches it, but calling it on its own writes a
// key into the registry that the wallet is not actually using.
// `deviceWallet.transferOwnership` rotates the key and updates the registry in one
// call, so that is the only way this surface offers to move it.

/**
 * Take on an eSIM wallet and clear any standby flag left by a transfer.
 *
 * The registry only accepts the calling device wallet as the new holder, so the
 * SDK fills that in and there is nothing to pass. The eSIM wallet's `owner()`
 * has to already be this device wallet: accept the ownership transfer first,
 * then bind.
 *
 * Reverts while a transfer is still pending on the eSIM wallet, and for any
 * address the eSIM wallet factory did not deploy.
 */
export const _bindESIMWallet = async (client: KokioSmartAccountClient, eSIMWalletAddress: Address) => {

    if(!client.account) throw new MissingSmartWalletError();

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.sendUserOperation({
        account: client.account,
        calls: [{
            to: values.factoryAddresses.REGISTRY,
            data: encodeFunctionData({
                abi: Registry,
                functionName: "bindESIMWallet",
                args: [eSIMWalletAddress, client.account.address]
            })
        }]
    });
}

/**
 * Flag an eSIM wallet as mid-transfer, or clear the flag when the move settles or
 * is called off.
 *
 * Only the flag moves. The registry keeps naming this device wallet as the eSIM
 * wallet's holder either way, so raising standby on a wallet still held here is
 * the ordinary case rather than a contradiction.
 */
export const _toggleESIMWalletStandbyStatus = async (
    client: KokioSmartAccountClient,
    eSIMWalletAddress: Address,
    isOnStandby: boolean
) => {

    if(!client.account) throw new MissingSmartWalletError();

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.sendUserOperation({
        account: client.account,
        calls: [{
            to: values.factoryAddresses.REGISTRY,
            data: encodeFunctionData({
                abi: Registry,
                functionName: "toggleESIMWalletStandbyStatus",
                args: [eSIMWalletAddress, isOnStandby]
            })
        }]
    });
}

/**
 * True once the device has a wallet on chain. Note this is not the same question
 * as `LazyWalletRegistry.isDeviceIdentifierReserved`, which only says whether
 * history has been recorded for the device, and is true well before anything is
 * deployed.
 */
export const _isDeviceIdentifierAlreadyUsed = async (client: KokioSmartAccountClient, deviceUniqueIdentifier: string): Promise<boolean> => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    // A `view` - read it directly instead of spending a userOp.
    return client.readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "isDeviceIdentifierAlreadyUsed",
        args: [deviceUniqueIdentifier]
    }) as Promise<boolean>;
}

/**
 * Whether the protocol is paused. While true, every ETH-moving path on the device
 * wallets and eSIM wallets reverts, so check this before offering a purchase.
 */
export const _paused = async (client: KokioSmartAccountClient): Promise<boolean> => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "paused",
        args: []
    }) as Promise<boolean>;
}

/**
 * The same pause check the wallets themselves run, which throws rather than
 * returning false. Use `_paused` to branch on it; use this when you want the
 * failure to carry the protocol's own revert reason.
 */
export const _requireNotPaused = async (client: KokioSmartAccountClient): Promise<void> => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    await client.readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "requireNotPaused",
        args: []
    });
}

/**
 * The device wallet holding an eSIM wallet, zero if it was never registered.
 * Despite the name this returns an address, not a boolean, and it keeps naming
 * the last holder after a release, so a non-zero answer is not proof anyone
 * holds it now. Ask `deviceWallet.isValidESIMWallet` for that.
 */
export const _isESIMWalletValid = async (client: KokioSmartAccountClient, eSIMWalletAddress: Address): Promise<Address> => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "isESIMWalletValid",
        args: [eSIMWalletAddress]
    }) as Promise<Address>;
}

/**
 * Whether a transfer is outstanding on an eSIM wallet. `bindESIMWallet` clears
 * it once the new device wallet takes the eSIM wallet on.
 *
 * Independent of `isESIMWalletValid`, and neither implies the other. A `true`
 * here is not a claim the wallet left the protocol, and it is normal for the
 * association to still name the device wallet that raised the flag.
 */
export const _isESIMWalletOnStandby = async (client: KokioSmartAccountClient, eSIMWalletAddress: Address): Promise<boolean> => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "isESIMWalletOnStandby",
        args: [eSIMWalletAddress]
    }) as Promise<boolean>;
}

/** Whether a device wallet is registered with the protocol. */
export const _isDeviceWalletValid = async (client: KokioSmartAccountClient, deviceWalletAddress: Address): Promise<boolean> => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "isDeviceWalletValid",
        args: [deviceWalletAddress]
    }) as Promise<boolean>;
}

/** The device wallet registered for a device identifier, zero if none. */
export const _uniqueIdentifierToDeviceWallet = async (client: KokioSmartAccountClient, deviceUniqueIdentifier: string): Promise<Address> => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "uniqueIdentifierToDeviceWallet",
        args: [deviceUniqueIdentifier]
    }) as Promise<Address>;
}

/** Whether an eSIM identifier is already held by a wallet. */
export const _isESIMIdentifierClaimed = async (client: KokioSmartAccountClient, eSIMUniqueIdentifier: string): Promise<boolean> => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "isESIMIdentifierClaimed",
        args: [eSIMUniqueIdentifier]
    }) as Promise<boolean>;
}

/**
 * The one eSIM wallet holding an eSIM identifier, zero if nobody holds it. Set
 * once and never cleared, an ownership transfer included, because the eSIM
 * belongs to the wallet rather than to whichever device is holding it.
 */
export const _eSIMWalletForIdentifier = async (client: KokioSmartAccountClient, eSIMUniqueIdentifier: string): Promise<Address> => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "eSIMWalletForIdentifier",
        args: [eSIMUniqueIdentifier]
    }) as Promise<Address>;
}

/** The fallback price ceiling in USD cents for a wallet holding no cap of its own. */
export const _defaultPriceCapUSDCents = async (client: KokioSmartAccountClient): Promise<bigint> => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "defaultPriceCapUSDCents",
        args: []
    }) as Promise<bigint>;
}

/**
 * Throws if a fiat user's eSIMs are already waiting on this device identifier.
 * Worth calling before a deployment: taking a reserved identifier strands the
 * lazy user, since the history copy, the wallet deployment and the device switch
 * all then refuse it.
 */
export const _requireDeviceIdentifierNotReserved = async (client: KokioSmartAccountClient, deviceUniqueIdentifier: string): Promise<void> => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    await client.readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "requireDeviceIdentifierNotReserved",
        args: [deviceUniqueIdentifier]
    });
}
