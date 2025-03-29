import { Address, encodeFunctionData, WalletClient } from "viem"
import { DataBundleDetails } from "../types";
import { SmartAccountClient } from "@aa-sdk/core";
import { customErrors } from "./constants";
import { ESIMWallet } from "../abis";


export const _setESIMUniqueIdentifier = async (client: SmartAccountClient, address: Address, eSIMUniqueIdentifier: string) => {

    if(!client.account) throw new Error(customErrors.MISSING_SMART_WALLET)
    
        // UserOp
    return client.sendUserOperation({
        account: client.account,
        uo:{
        target: address,
        data: encodeFunctionData({
            abi: ESIMWallet,
            functionName: "setESIMUniqueIdentifier",
            args: [eSIMUniqueIdentifier]
        })
    }})
}

export const _buyDataBundle = async (client: SmartAccountClient, address: Address, dataBundleDetails: DataBundleDetails) => {
    
    if(!client.account) throw new Error(customErrors.MISSING_SMART_WALLET)
    
        // UserOp
    return client.sendUserOperation({
        account: client.account,
        uo:{
        target: address,
        data: encodeFunctionData({
            abi: ESIMWallet,
            functionName: "payETHForDataBundles",
            args: [dataBundleDetails]
        })
    }})
}

export const _populateHistory = async (client: SmartAccountClient, address: Address, dataBundleDetails: Array<DataBundleDetails>) => {

    if(!client.account) throw new Error(customErrors.MISSING_SMART_WALLET)
    
        // UserOp
    return client.sendUserOperation({
        account: client.account,
        uo:{
        target: address,
        data: encodeFunctionData({
            abi: ESIMWallet,
            functionName: "populateHistory",
            args: [dataBundleDetails]
        })
    }})
}

export const _owner = async (client: SmartAccountClient, address: Address) => {

    if(!client.account) throw new Error(customErrors.MISSING_SMART_WALLET)
    
        // UserOp
    return client.sendUserOperation({
        account: client.account,
        uo:{
        target: address,
        data: encodeFunctionData({
            abi: ESIMWallet,
            functionName: "ow",
            args: []
        })
    }})}

export const _requestTransferOwnership = async (client: SmartAccountClient, address: Address, newOwner: Address) => {

    if(!client.account) throw new Error(customErrors.MISSING_SMART_WALLET)
    
        // UserOp
    return client.sendUserOperation({
        account: client.account,
        uo:{
        target: address,
        data: encodeFunctionData({
            abi: ESIMWallet,
            functionName: "requestTransferOwnership",
            args: [newOwner]
        })
    }})
}

export const _acceptOwnershipTransfer = async (client: SmartAccountClient, address: Address) => {
    if(!client.account) throw new Error(customErrors.MISSING_SMART_WALLET)
    
        // UserOp
    return client.sendUserOperation({
        account: client.account,
        uo:{
        target: address,
        data: encodeFunctionData({
            abi: ESIMWallet,
            functionName: "acceptOwnershipTransfer",
            args: []
        })
    }})
}

export const _sendETHToDeviceWallet = async (client: SmartAccountClient, address: Address, amount: bigint) => {

    if(!client.account) throw new Error(customErrors.MISSING_SMART_WALLET)
    
        // UserOp
    return client.sendUserOperation({
        account: client.account,
        uo:{
        target: address,
        data: encodeFunctionData({
            abi: ESIMWallet,
            functionName: "sendETHToDeviceWallet",
            args: [amount]
        })
    }})
}

export const _transferOwnership = async (client: SmartAccountClient, address: Address, amount: bigint) => {

    if(!client.account) throw new Error(customErrors.MISSING_SMART_WALLET)
    
        // UserOp
    return client.sendUserOperation({
        account: client.account,
        uo:{
        target: address,
        data: encodeFunctionData({
            abi: ESIMWallet,
            functionName: "transferOwnership",
            args: [amount]
        })
    }})
}