import { WalletClient } from "viem";
import { getContractInstance } from "./contracts";

export const _createAccount = async (
    client: WalletClient,
    deviceUniqueIdentifier: string,
    deviceWalletOwnerKey: string,
    salt: bigint,
    depositAmount: bigint
) => {

    const contract = (await getContractInstance(client)).deviceWalletFactory();

    return contract.write.createAccount([deviceUniqueIdentifier, deviceWalletOwnerKey, salt, depositAmount]);
}

export const _getAddress = async (
    client: WalletClient,
    deviceUniqueIdentifier: string,
    deviceWalletOwnerKey: string,
    salt: bigint,
) => {

    const contract = (await getContractInstance(client)).deviceWalletFactory();

    return contract.read.getAddress([deviceWalletOwnerKey, deviceUniqueIdentifier, salt]);
}

export const _getCurrentDeviceWalletImplementation = async (client: WalletClient) => {

    const contract = (await getContractInstance(client)).deviceWalletFactory();
    
    return contract.read.getCurrentDeviceWalletImplementation();
}