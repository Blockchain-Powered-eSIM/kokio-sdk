import { Address, encodeFunctionData, WalletClient } from "viem"
import { _getChainSpecificConstants, customErrors } from "./constants.js";
import { SmartAccountClient } from "@aa-sdk/core";
import { ESIMWalletFactory } from "../abis/index.js";

export const _addRegistryAddress = async (client: SmartAccountClient, registryContractAddress: Address) => {

    const values = _getChainSpecificConstants(await client.getChainId());
    if(!client.account) throw new Error(customErrors.MISSING_SMART_WALLET)
    
    // UserOp
    return client.sendUserOperation({
        account: client.account,
        uo:{
            target: values.factoryAddresses.ESIM_WALLET_FACTORY,
            data: encodeFunctionData({
                abi: ESIMWalletFactory,
                functionName: "addRegistryAddress",
                args: [registryContractAddress]
            })
        }
    });
}

export const _deployESIMWalletWithEOA = async (client: WalletClient, deviceWalletAddress: Address, salt: bigint) => {

    const chainID = await client.getChainId();
    const values = _getChainSpecificConstants(chainID);

    if (!client.account) throw new Error(customErrors.MISSING_EOA_WALLET);

    return client.writeContract({
        address: values.factoryAddresses.ESIM_WALLET_FACTORY,
        chain: values.chain,
        account: client.account.address,
        abi: ESIMWalletFactory,
        functionName: 'deployESIMWallet',
        args: [deviceWalletAddress, salt]
    });
}

export const _deployESIMWalletWithUserOp = async (client: SmartAccountClient, deviceWalletAddress: Address, salt: bigint) => {

    const values = _getChainSpecificConstants(await client.getChainId());
    if(!client.account) throw new Error(customErrors.MISSING_SMART_WALLET)
    
    // UserOp
    return client.sendUserOperation({
        account: client.account,
        uo:{
            target: values.factoryAddresses.ESIM_WALLET_FACTORY,
            data: encodeFunctionData({
                abi: ESIMWalletFactory,
                functionName: "deployESIMWallet",
                args: [deviceWalletAddress, salt]
            })
        }
    });
}

export const _getCurrentESIMWalletImplementation = async (client: SmartAccountClient) => {

    const values = _getChainSpecificConstants(await client.getChainId());
    if(!client.account) throw new Error(customErrors.MISSING_SMART_WALLET)
    
    // UserOp
    return client.sendUserOperation({
        account: client.account,
        uo:{
            target: values.factoryAddresses.ESIM_WALLET_FACTORY,
            data: encodeFunctionData({
                abi: ESIMWalletFactory,
                functionName: "getCurrentESIMWalletImplementation",
                args: []
            })
        }
    });
}
