import { Address, WalletClient } from "viem"
import { getContractInstance } from "./contracts"

export const _addRegistryAddress = async (client: WalletClient, registryContractAddress: Address) => {

    const contract = (await getContractInstance(client)).ESIMWalletFactory();

    return contract.write.addRegistryAddress([registryContractAddress]);
}

export const _deployESIMWallet = async (client: WalletClient, deviceWalletAddress: Address, salt: bigint) => {

    const contract = (await getContractInstance(client)).ESIMWalletFactory();

    return contract.write.deployESIMWallet([deviceWalletAddress, salt]);
}

export const _getCurrentESIMWalletImplementation = async (client: WalletClient) => {

    const contract = (await getContractInstance(client)).ESIMWalletFactory();

    return contract.read.getCurrentESIMWalletImplementation();
}