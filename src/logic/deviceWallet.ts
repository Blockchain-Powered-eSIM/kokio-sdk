import { Address, encodeFunctionData, WalletClient } from "viem";
import { SmartAccountClient } from "@aa-sdk/core";
import { DeviceWallet } from "../abis/index.js";
import { customErrors } from "./constants.js";

export const _deployESIMWallet = async (client: SmartAccountClient, address: Address, hasAccessToETH: boolean, salt: bigint) => {

    if(!client.account) throw new Error(customErrors.MISSING_SMART_WALLET)
    
        // UserOp
    return client.sendUserOperation({
        account: client.account,
        uo:{
        target: address,
        data: encodeFunctionData({
            abi: DeviceWallet,
            functionName: "deployESIMWallet",
            args: [hasAccessToETH, salt]
        })
    }})
}

export const _setESIMUniqueIdentifierForAnESIMWallet = async (
    client: SmartAccountClient,
    address: Address,
    eSIMWalletAddress: Address,
    eSIMUniqueIdentifier: string
) => {

    if(!client.account) throw new Error(customErrors.MISSING_SMART_WALLET)
    
        // UserOp
    return client.sendUserOperation({
        account: client.account,
        uo:{
        target: address,
        data: encodeFunctionData({
            abi: DeviceWallet,
            functionName: "setESIMUniqueIdentifierForAnESIMWallet",
            args: [eSIMWalletAddress, eSIMUniqueIdentifier]
        })
    }})
    // const contract = (await getContractInstance(client)).deviceWallet(address);

    // return contract.write.setESIMUniqueIdentifierForAnESIMWallet([eSIMWalletAddress, eSIMUniqueIdentifier]);
}

export const _payETHForDataBundles = async (client: SmartAccountClient, address: Address, amount: bigint) => {

    if(!client.account) throw new Error(customErrors.MISSING_SMART_WALLET)
    
        // UserOp
    return client.sendUserOperation({
        account: client.account,
        uo:{
        target: address,
        data: encodeFunctionData({
            abi: DeviceWallet,
            functionName: "payETHForDataBundles",
            args: [amount]
        })
    }})
}

export const _pullETH = async (client: SmartAccountClient, address: Address, amount: bigint) => {
    
    if(!client.account) throw new Error(customErrors.MISSING_SMART_WALLET)
    
        // UserOp
    return client.sendUserOperation({
        account: client.account,
        uo:{
        target: address,
        data: encodeFunctionData({
            abi: DeviceWallet,
            functionName: "pullETH",
            args: [address, amount]
        })
    }})
}

export const _getVaultAddress = async (client: SmartAccountClient, address: Address) => {

    if(!client.account) throw new Error(customErrors.MISSING_SMART_WALLET)
    
        // UserOp
    return client.sendUserOperation({
        account: client.account,
        uo:{
        target: address,
        data: encodeFunctionData({
            abi: DeviceWallet,
            functionName: "getVaultAddress",
            args: [address]
        })
    }})
}

export const _toggleAccessToETH = async (client: SmartAccountClient, address: Address, eSIMWalletAddress: Address, hasAccessToETH: boolean) => {

    if(!client.account) throw new Error(customErrors.MISSING_SMART_WALLET)
    
        // UserOp
    return client.sendUserOperation({
        account: client.account,
        uo:{
        target: address,
        data: encodeFunctionData({
            abi: DeviceWallet,
            functionName: "toggleAccessToETH",
            args: [address, eSIMWalletAddress, hasAccessToETH]
        })
    }})
}

export const _addESIMWallet = async (client: SmartAccountClient, address: Address, eSIMWalletAddress: Address, hasAccessToETH: boolean) => {

    if(!client.account) throw new Error(customErrors.MISSING_SMART_WALLET)
    
        // UserOp
    return client.sendUserOperation({
        account: client.account,
        uo:{
        target: address,
        data: encodeFunctionData({
            abi: DeviceWallet,
            functionName: "addESIMWallet",
            args: [address, eSIMWalletAddress, hasAccessToETH]
        })
    }})
}

export const _removeESIMWallet = async (client: SmartAccountClient, address: Address, eSIMWalletAddress: Address, hasAccessToETH: boolean) => {


    if(!client.account) throw new Error(customErrors.MISSING_SMART_WALLET)
    
        // UserOp
    return client.sendUserOperation({
        account: client.account,
        uo:{
        target: address,
        data: encodeFunctionData({
            abi: DeviceWallet,
            functionName: "removeESIMWallet",
            args: [address, eSIMWalletAddress, hasAccessToETH]
        })
    }})
}