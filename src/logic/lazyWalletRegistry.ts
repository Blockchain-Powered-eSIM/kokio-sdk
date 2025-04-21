import { encodeFunctionData, Hex, WalletClient } from "viem";
import { DataBundleDetails } from "../types.js";
import { _getChainSpecificConstants, customErrors } from "./constants.js";
import { SmartAccountClient } from "@aa-sdk/core";
import { LazyWalletRegistry } from "../abis/index.js";


export const _isLazyWalletDeployed = async (client: SmartAccountClient, deviceUniqueIdentifier: string) => {

    const values = _getChainSpecificConstants(await client.getChainId());
    if(!client.account) throw new Error(customErrors.MISSING_SMART_WALLET)
    
        // UserOp
    return client.sendUserOperation({
        account: client.account,
        uo:{
        target: values.factoryAddresses.LAZY_WALLET_REGISTRY,
        data: encodeFunctionData({
            abi: LazyWalletRegistry,
            functionName: "isLazyWalletDeployed",
            args: [deviceUniqueIdentifier]
        })
    }});
}

export const _batchPopulateHistory = async (
    client: SmartAccountClient,
    deviceUniqueIdentifiers: Array<string>,
    eSIMUniqueIdentifiers: Array<Array<string>>,
    dataBundleDetails: Array<Array<DataBundleDetails>>
) => {

    const values = _getChainSpecificConstants(await client.getChainId());
    if(!client.account) throw new Error(customErrors.MISSING_SMART_WALLET)
    
        // UserOp
    return client.sendUserOperation({
        account: client.account,
        uo:{
        target: values.factoryAddresses.LAZY_WALLET_REGISTRY,
        data: encodeFunctionData({
            abi: LazyWalletRegistry,
            functionName: "batchPopulateHistory",
            args: [deviceUniqueIdentifiers, eSIMUniqueIdentifiers, dataBundleDetails]
        })
    }});
}

export const _deployLazyWalletAndSetESIMIdentifier = async (
    client: SmartAccountClient,
    deviceOwnerPublicKey: Hex[2],
    deviceUniqueIdentifier: string,
    salt: bigint,
    depositAmount: bigint
) => {

    const values = _getChainSpecificConstants(await client.getChainId());
    if(!client.account) throw new Error(customErrors.MISSING_SMART_WALLET)
    
        // UserOp
    return client.sendUserOperation({
        account: client.account,
        uo:{
        target: values.factoryAddresses.LAZY_WALLET_REGISTRY,
        data: encodeFunctionData({
            abi: LazyWalletRegistry,
            functionName: "deployLazyWalletAndSetESIMIdentifier",
            args: [deviceOwnerPublicKey, deviceUniqueIdentifier, salt, depositAmount]
        })
    }});
}

export const _switchESIMIdentifierToNewDeviceIdentifier = async (
    client: SmartAccountClient,
    eSIMIdentifier: string,
    oldDeviceIdentifier: string,
    newDeviceIdentifier: string
) => {

    const values = _getChainSpecificConstants(await client.getChainId());
    if(!client.account) throw new Error(customErrors.MISSING_SMART_WALLET)
    
        // UserOp
    return client.sendUserOperation({
        account: client.account,
        uo:{
        target: values.factoryAddresses.LAZY_WALLET_REGISTRY,
        data: encodeFunctionData({
            abi: LazyWalletRegistry,
            functionName: "switchESIMIdentifierToNewDeviceIdentifier",
            args: [eSIMIdentifier, oldDeviceIdentifier, newDeviceIdentifier]
        })
    }});
}
