import { Address, WalletClient } from "viem";
import {
    _deployESIMWalletWithUserOp,
    _getCurrentESIMWalletImplementation
} from "../logic/eSIMWalletFactory.js"
import { SmartAccountClient } from "@aa-sdk/core";

export class ESIMWalletFactorySubPackage {

    smartAccountClient: SmartAccountClient;
    walletClient;

    constructor(walletClient: WalletClient, smartAccountClient: SmartAccountClient) {
        this.smartAccountClient = smartAccountClient;
        this.walletClient = walletClient
    }

    deployESIMWalletWithUserOp (deviceWalletAddress: Address, salt: bigint) {
        return _deployESIMWalletWithUserOp (this.smartAccountClient, deviceWalletAddress, salt);
    }

    getCurrentESIMWalletImplementation () {
        return _getCurrentESIMWalletImplementation(this.smartAccountClient);
    }
}
