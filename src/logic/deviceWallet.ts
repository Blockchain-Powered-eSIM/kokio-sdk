import { Address, createPublicClient, encodeFunctionData, getContract, PublicClient, WalletClient } from "viem";
import { SmartAccountClient } from "@aa-sdk/core";
import { DeviceWallet } from "../abis/index.js";
import { customErrors } from "./constants.js";
import { P256Key } from "../types.js";

export const _deployESIMWallet = async (client: SmartAccountClient, address: Address, hasAccessToETH: boolean, salt: bigint) => {

    if(!client.account) throw new Error(customErrors.MISSING_SMART_WALLET);
    
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
        }
    });
}

export const _setESIMUniqueIdentifierForAnESIMWallet = async (
    client: SmartAccountClient,
    address: Address,
    eSIMWalletAddress: Address,
    eSIMUniqueIdentifier: string
) => {

    if(!client.account) throw new Error(customErrors.MISSING_SMART_WALLET);
    
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
        }
    });
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
        }
    });
}

export const _pullETH = async (client: SmartAccountClient, address: Address, amount: bigint) => {
    
    if(!client.account) throw new Error(customErrors.MISSING_SMART_WALLET);
    
    // UserOp
    return client.sendUserOperation({
        account: client.account,
        uo:{
            target: address,
            data: encodeFunctionData({
                abi: DeviceWallet,
                functionName: "pullETH",
                args: [amount]
            })
        }
    });
}

export const _getVaultAddress = async (client: SmartAccountClient, address: Address) => {

    if(!client.account) throw new Error(customErrors.MISSING_SMART_WALLET);
    
    // UserOp
    return client.sendUserOperation({
        account: client.account,
        uo:{
            target: address,
            data: encodeFunctionData({
                abi: DeviceWallet,
                functionName: "getVaultAddress",
                args: []
            })
        }
    });
}

export const _toggleAccessToETH = async (client: SmartAccountClient, address: Address, eSIMWalletAddress: Address, hasAccessToETH: boolean) => {

    if(!client.account) throw new Error(customErrors.MISSING_SMART_WALLET);
    
    // UserOp
    return client.sendUserOperation({
        account: client.account,
        uo:{
            target: address,
            data: encodeFunctionData({
                abi: DeviceWallet,
                functionName: "toggleAccessToETH",
                args: [eSIMWalletAddress, hasAccessToETH]
            })
        }
    });
}

export const _addESIMWallet = async (client: SmartAccountClient, address: Address, eSIMWalletAddress: Address, hasAccessToETH: boolean) => {

    if(!client.account) throw new Error(customErrors.MISSING_SMART_WALLET);
    
    // UserOp
    return client.sendUserOperation({
        account: client.account,
        uo:{
            target: address,
            data: encodeFunctionData({
                abi: DeviceWallet,
                functionName: "addESIMWallet",
                args: [eSIMWalletAddress, hasAccessToETH]
            })
        }
    });
}

export const _removeESIMWallet = async (client: SmartAccountClient, address: Address, eSIMWalletAddress: Address, hasAccessToETH: boolean) => {

    if(!client.account) throw new Error(customErrors.MISSING_SMART_WALLET);
    
    // UserOp
    return client.sendUserOperation({
        account: client.account,
        uo:{
            target: address,
            data: encodeFunctionData({
                abi: DeviceWallet,
                functionName: "removeESIMWallet",
                args: [eSIMWalletAddress, hasAccessToETH]
            })
        }
    });
}

export const _getOwner = async (client: WalletClient, address: Address) => {

    const contract = getContract({
        abi: DeviceWallet,
        address: address,
        client
    })

    const x = await contract.read.owner([0]);
    const y = await contract.read.owner([1]);

    const owner = [x,y]; 
    return owner as P256Key;
}
