import { Hex, WalletClient } from "viem";
import { getContractInstance } from "./contracts";
import { DataBundleDetails } from "../types";


export const _isLazyWalletDeployed = async (client: WalletClient, deviceUniqueIdentifier: string) => {

    const contract = (await getContractInstance(client)).lazyWalletRegistry();

    return contract.read.isLazyWalletDeployed([deviceUniqueIdentifier]);
}

export const _batchPopulateHistory = async (
    client: WalletClient,
    deviceUniqueIdentifiers: Array<string>,
    eSIMUniqueIdentifiers: Array<Array<string>>,
    dataBundleDetails: Array<Array<DataBundleDetails>>
) => {

    const contract = (await getContractInstance(client)).lazyWalletRegistry();

    return contract.write.batchPopulateHistory([deviceUniqueIdentifiers, eSIMUniqueIdentifiers, dataBundleDetails]);
}

export const _deployLazyWalletAndSetESIMIdentifier = async (
    client: WalletClient,
    deviceOwnerPublicKey: Hex[2],
    deviceUniqueIdentifier: string,
    salt: bigint,
    depositAmount: bigint
) => {

    const contract = (await getContractInstance(client)).lazyWalletRegistry();

    return contract.write.deployLazyWalletAndSetESIMIdentifier([
        deviceOwnerPublicKey,
        deviceUniqueIdentifier,
        salt,
        depositAmount
    ]);
}

export const _switchESIMIdentifierToNewDeviceIdentifier = async (
    client: WalletClient,
    eSIMIdentifier: string,
    oldDeviceIdentifier: string,
    newDeviceIdentifier: string
) => {

    const contract = (await getContractInstance(client)).lazyWalletRegistry();

    return contract.write.switchESIMIdentifierToNewDeviceIdentifier([eSIMIdentifier, oldDeviceIdentifier, newDeviceIdentifier]);
}
