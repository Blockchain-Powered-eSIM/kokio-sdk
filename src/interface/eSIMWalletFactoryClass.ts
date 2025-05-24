import { Address, WalletClient } from "viem";
import {
    _addRegistryAddress,
    _deployESIMWalletWithEOA,
    _deployESIMWalletWithUserOp,
    _getCurrentESIMWalletImplementation
} from "../logic/eSIMWalletFactory.js"
import { SmartAccountClient } from "@aa-sdk/core";

export class ESIMWalletFactorySubPackage {

    smartAccountClient;
    walletClient;

    constructor(walletClient: WalletClient, smartAccountClient: SmartAccountClient) {
        this.smartAccountClient = smartAccountClient;
        this.walletClient = walletClient
    }

    deployESIMWalletWithEOA (deviceWalletAddress: Address, salt: bigint) {
        return _deployESIMWalletWithEOA (this.walletClient, deviceWalletAddress, salt);
    }


    deployESIMWalletWithUserOp (deviceWalletAddress: Address, salt: bigint) {
        return _deployESIMWalletWithUserOp (this.smartAccountClient, deviceWalletAddress, salt);
    }

    addRegistryAddress (registryContractAddress: Address) {
        return _addRegistryAddress(this.smartAccountClient, registryContractAddress);
    }

    _getCurrentESIMWalletImplementation () {
        return _getCurrentESIMWalletImplementation(this.smartAccountClient);
    }
}
