import { Address, WalletClient } from "viem";
import { KokioSmartAccountClient } from "../types.js";
import { _getChainSpecificConstants } from "./constants.js";
import { MissingEOAWalletError } from "./errors.js";
import { DeviceWalletFactory } from "../abis/index.js";
import { P256Key } from "../types.js";

export const _createAccountWithEOA = async (
    client: WalletClient,
    deviceUniqueIdentifier: string,
    deviceWalletOwnerKey: P256Key,
    salt: bigint,
    depositAmount: bigint
) => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    if (!client.account) throw new MissingEOAWalletError();

    // createAccount(string uid, bytes32[2] ownerKey, uint256 salt) is payable -
    // the deposit is the msg.value, not a 4th positional argument.
    return client.writeContract({
        address: values.factoryAddresses.DEVICE_WALLET_FACTORY,
        chain: values.chain,
        account: client.account.address,
        abi: DeviceWalletFactory,
        functionName: 'createAccount',
        args: [deviceUniqueIdentifier, deviceWalletOwnerKey, salt],
        value: depositAmount
    });
}

// `getCounterFactualAddress` is a `view` - read it directly instead of spending a userOp.
// On-chain arg order is (bytes32[2] ownerKey, string uid, uint256 salt); note this
// differs from `createAccount`.
export const _getAddress = async (
    client: KokioSmartAccountClient,
    deviceUniqueIdentifier: string,
    deviceWalletOwnerKey: P256Key,
    salt: bigint,
): Promise<Address> => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.readContract({
        address: values.factoryAddresses.DEVICE_WALLET_FACTORY,
        abi: DeviceWalletFactory,
        functionName: "getCounterFactualAddress",
        args: [deviceWalletOwnerKey, deviceUniqueIdentifier, salt]
    }) as Promise<Address>;
}

// `getCurrentDeviceWalletImplementation` is a `view` - read it directly instead of a userOp.
export const _getCurrentDeviceWalletImplementation = async (client: KokioSmartAccountClient): Promise<Address> => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.readContract({
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
 * Call this first. `createAccount` runs inside EntryPoint validation, where the
 * 4337 rules bar it from reading the registry, so it cannot see that an
 * identifier or a key is taken: it deploys a second wallet at a fresh address
 * and the `postCreateAccount` that would register it fails afterwards.
 *
 * Reverts on an empty identifier or a key that is not a point on the P256 curve.
 */
export const _preCreateAccountValidation = async (
    client: KokioSmartAccountClient,
    deviceUniqueIdentifier: string,
    deviceWalletOwnerKey: P256Key
): Promise<Address> => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.readContract({
        address: values.factoryAddresses.DEVICE_WALLET_FACTORY,
        abi: DeviceWalletFactory,
        functionName: "preCreateAccountValidation",
        args: [deviceUniqueIdentifier, deviceWalletOwnerKey]
    }) as Promise<Address>;
}

/**
 * Whether the factory has recorded this wallet. Set by `postCreateAccount`, not
 * by the deploy, so a wallet the app just created reads false until the backend
 * registers it.
 */
export const _deviceWalletInfoAdded = async (client: KokioSmartAccountClient, deviceWallet: Address): Promise<boolean> => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.readContract({
        address: values.factoryAddresses.DEVICE_WALLET_FACTORY,
        abi: DeviceWalletFactory,
        functionName: "deviceWalletInfoAdded",
        args: [deviceWallet]
    }) as Promise<boolean>;
}

/**
 * The beacon every device wallet reads its implementation from. One update moves
 * all of them and no wallet can decline it.
 */
export const _beacon = async (client: KokioSmartAccountClient): Promise<Address> => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.readContract({
        address: values.factoryAddresses.DEVICE_WALLET_FACTORY,
        abi: DeviceWalletFactory,
        functionName: "beacon",
        args: []
    }) as Promise<Address>;
}

/** The registry the factory writes new wallets into. */
export const _registry = async (client: KokioSmartAccountClient): Promise<Address> => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.readContract({
        address: values.factoryAddresses.DEVICE_WALLET_FACTORY,
        abi: DeviceWalletFactory,
        functionName: "registry",
        args: []
    }) as Promise<Address>;
}

/** The EntryPoint baked into every device wallet this factory deploys. */
export const _entryPoint = async (client: KokioSmartAccountClient): Promise<Address> => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.readContract({
        address: values.factoryAddresses.DEVICE_WALLET_FACTORY,
        abi: DeviceWalletFactory,
        functionName: "entryPoint",
        args: []
    }) as Promise<Address>;
}

/** The contract new device wallets verify WebAuthn assertions through. */
export const _verifier = async (client: KokioSmartAccountClient): Promise<Address> => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.readContract({
        address: values.factoryAddresses.DEVICE_WALLET_FACTORY,
        abi: DeviceWalletFactory,
        functionName: "verifier",
        args: []
    }) as Promise<Address>;
}
