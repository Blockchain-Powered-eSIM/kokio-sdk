import { encodeFunctionData } from "viem";
import { SmartAccountClient } from "@aa-sdk/core";
import { _extractChainID, _getChainSpecificConstants, customErrors } from "./constants.js";
import { DeviceWalletFactory } from "../abis/index.js";

// export const _createAccount = async (
//     client: WalletClient,
//     deviceUniqueIdentifier: string,
//     deviceWalletOwnerKey: string,
//     salt: bigint,
//     depositAmount: bigint
// ) => {

//     const contract = (await getContractInstance(client)).deviceWalletFactory();

//     return contract.write.createAccount([deviceUniqueIdentifier, deviceWalletOwnerKey, salt, depositAmount]);
// }

export const _getAddress = async (
    client: SmartAccountClient,
    deviceUniqueIdentifier: string,
    deviceWalletOwnerKey: string,
    salt: bigint,
) => {

    const values = _getChainSpecificConstants(await client.getChainId());
    if(!client.account) throw new Error(customErrors.MISSING_SMART_WALLET)
    
    // UserOp
    return client.sendUserOperation({
        account: client.account,
        uo:{
            target: values.factoryAddresses.DEVICE_WALLET_FACTORY,
            data: encodeFunctionData({
                abi: DeviceWalletFactory,
                functionName: "getAddress",
                args: [deviceUniqueIdentifier, deviceWalletOwnerKey, salt]
            })
        }
    });
}

export const _getCurrentDeviceWalletImplementation = async (client: SmartAccountClient) => {

    const values = _getChainSpecificConstants(await client.getChainId());
    if(!client.account) throw new Error(customErrors.MISSING_SMART_WALLET)
    
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
