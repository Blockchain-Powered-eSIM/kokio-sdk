import { Address, encodeFunctionData, WalletClient } from "viem"
import { _getChainSpecificConstants, customErrors } from "./constants";
import { SmartAccountClient } from "@aa-sdk/core";
import { ESIMWalletFactory } from "../abis";

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
    }});
}

// export const _deployESIMWallet = async (client: WalletClient, deviceWalletAddress: Address, salt: bigint) => {

//     const contract = (await getContractInstance(client)).ESIMWalletFactory();

//     return contract.write.deployESIMWallet([deviceWalletAddress, salt]);
// }

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
    }});
}