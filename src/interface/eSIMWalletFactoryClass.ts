import { Address, WalletClient } from "viem";
import {
    _addRegistryAddress,
    _getCurrentESIMWalletImplementation
} from "../logic/eSIMWalletFactory"
import { SmartAccountClient } from "@aa-sdk/core";

export class eSIMWalletFactorySubPackage {

    client;

    constructor(client: SmartAccountClient) {
        this.client = client;
    }

    addRegistryAddress (registryContractAddress: Address) {
        return _addRegistryAddress(this.client, registryContractAddress);
    }

    _getCurrentESIMWalletImplementation () {
        return _getCurrentESIMWalletImplementation(this.client);
    }
}