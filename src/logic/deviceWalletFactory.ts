import { Address, WalletClient } from "viem";
import { SmartAccountClient } from "@aa-sdk/core";
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
    client: SmartAccountClient,
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
export const _getCurrentDeviceWalletImplementation = async (client: SmartAccountClient): Promise<Address> => {

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
