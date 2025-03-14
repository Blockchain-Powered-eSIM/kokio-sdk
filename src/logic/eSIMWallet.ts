import { Address, WalletClient } from "viem"
import { getContractInstance } from "./contracts"
import { DataBundleDetails } from "../types";


export const _setESIMUniqueIdentifier = async (client: WalletClient, address: Address, eSIMUniqueIdentifier: string) => {

    const contract = (await getContractInstance(client)).ESIMWallet(address);

    return contract.write.setESIMUniqueIdentifier([eSIMUniqueIdentifier]);
}

export const _buyDataBundle = async (client: WalletClient, address: Address, dataBundleDetails: DataBundleDetails) => {

    const contract = (await getContractInstance(client)).ESIMWallet(address);

    return contract.write.buyDataBundle([dataBundleDetails]);
}

export const _populateHistory = async (client: WalletClient, address: Address, dataBundleDetails: Array<DataBundleDetails>) => {

    const contract = (await getContractInstance(client)).ESIMWallet(address);

    return contract.write.populateHistory([dataBundleDetails]);
}

export const _owner = async (client: WalletClient, address: Address) => {

    const contract = (await getContractInstance(client)).ESIMWallet(address);

    return contract.read.owner();
}

export const _requestTransferOwnership = async (client: WalletClient, address: Address, newOwner: Address) => {

    const contract = (await getContractInstance(client)).ESIMWallet(address);

    return contract.write.requestTransferOwnership([newOwner]);
}

export const _acceptOwnershipTransfer = async (client: WalletClient, address: Address) => {

    const contract = (await getContractInstance(client)).ESIMWallet(address);

    return contract.write.acceptOwnershipTransfer();
}

export const _sendETHToDeviceWallet = async (client: WalletClient, address: Address, amount: bigint) => {

    const contract = (await getContractInstance(client)).ESIMWallet(address);

    return contract.write.sendETHToDeviceWallet([amount]);
}

export const _transferOwnership = async (client: WalletClient, address: Address, amount: bigint) => {

    const contract = (await getContractInstance(client)).ESIMWallet(address);

    return contract.write.transferOwnership([]);
}