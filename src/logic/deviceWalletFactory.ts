import { encodeFunctionData, WalletClient } from "viem";
import { SmartAccountClient } from "@aa-sdk/core";
import { _extractChainID, _getChainSpecificConstants } from "./constants.js";
import { MissingEOAWalletError, MissingSmartWalletError } from "./errors.js";
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

    // createAccount(string uid, bytes32[2] ownerKey, uint256 salt) is payable —
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

export const _getAddress = async (
    client: SmartAccountClient,
    deviceUniqueIdentifier: string,
    deviceWalletOwnerKey: P256Key,
    salt: bigint,
) => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    if(!client.account) throw new MissingSmartWalletError()

    // UserOp — the on-chain view is `getCounterFactualAddress(bytes32[2] ownerKey,
    // string uid, uint256 salt)`; note the arg order differs from createAccount.
    return client.sendUserOperation({
        account: client.account,
        uo:{
            target: values.factoryAddresses.DEVICE_WALLET_FACTORY,
            data: encodeFunctionData({
                abi: DeviceWalletFactory,
                functionName: "getCounterFactualAddress",
                args: [deviceWalletOwnerKey, deviceUniqueIdentifier, salt]
            })
        }
    });
}

export const _getCurrentDeviceWalletImplementation = async (client: SmartAccountClient) => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    if(!client.account) throw new MissingSmartWalletError()
    
    // UserOp
    return client.sendUserOperation({
        account: client.account,
        uo:{
            target: values.factoryAddresses.DEVICE_WALLET_FACTORY,
            data: encodeFunctionData({
                abi: DeviceWalletFactory,
                functionName: "getCurrentDeviceWalletImplementation",
                args: []
            })
        }
    });
}
