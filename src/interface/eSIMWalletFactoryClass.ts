import { Address, WalletClient } from "viem";
import {
    _addRegistryAddress,
    _deployESIMWallet,
    _getCurrentESIMWalletImplementation
} from "../logic/eSIMWalletFactory"

export class eSIMWalletFactorySubPackage {

    client;

    constructor(client: WalletClient) {
        this.client = client;
    }

    addRegistryAddress (registryContractAddress: Address) {
        return _addRegistryAddress(this.client, registryContractAddress);
    }

    _deployESIMWallet (deviceWalletAddress: Address, salt: bigint) {
        return _deployESIMWallet(this.client, deviceWalletAddress, salt);
    }

    _getCurrentESIMWalletImplementation () {
        return _getCurrentESIMWalletImplementation(this.client);
    }
}