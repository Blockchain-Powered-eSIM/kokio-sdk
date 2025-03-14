import { Address, WalletClient } from "viem";
import { getContractInstance } from "./contracts";

export const _deployESIMWallet = async (client: WalletClient, address: Address, hasAccessToETH: boolean, salt: bigint) => {

    const contract = (await getContractInstance(client)).deviceWallet(address);

    return contract.write.deployESIMWallet([hasAccessToETH, salt]);
}

export const _setESIMUniqueIdentifierForAnESIMWallet = async (
    client: WalletClient,
    address: Address,
    eSIMWalletAddress: Address,
    eSIMUniqueIdentifier: string
) => {

    const contract = (await getContractInstance(client)).deviceWallet(address);

    return contract.write.setESIMUniqueIdentifierForAnESIMWallet([eSIMWalletAddress, eSIMUniqueIdentifier]);
}

export const _payETHForDataBundles = async (client: WalletClient, address: Address, amount: bigint) => {

    const contract = (await getContractInstance(client)).deviceWallet(address);

    return contract.write.payETHForDataBundles([amount]);
}

export const _pullETH = async (client: WalletClient, address: Address, amount: bigint) => {

    const contract = (await getContractInstance(client)).deviceWallet(address);

    return contract.write.pullETH([amount]);
}

export const _getVaultAddress = async (client: WalletClient, address: Address) => {

    const contract = (await getContractInstance(client)).deviceWallet(address);

    return contract.read.getVaultAddress();
}

export const _toggleAccessToETH = async (client: WalletClient, address: Address, eSIMWalletAddress: Address, hasAccessToETH: boolean) => {

    const contract = (await getContractInstance(client)).deviceWallet(address);

    return contract.write.toggleAccessToETH([eSIMWalletAddress, hasAccessToETH]);
}

export const _addESIMWallet = async (client: WalletClient, address: Address, eSIMWalletAddress: Address, hasAccessToETH: boolean) => {

    const contract = (await getContractInstance(client)).deviceWallet(address);

    return contract.write.addESIMWallet([eSIMWalletAddress, hasAccessToETH]);
}

export const _removeESIMWallet = async (client: WalletClient, address: Address, eSIMWalletAddress: Address, hasAccessToETH: boolean) => {

    const contract = (await getContractInstance(client)).deviceWallet(address);

    return contract.write.removeESIMWallet([eSIMWalletAddress, hasAccessToETH]);
}