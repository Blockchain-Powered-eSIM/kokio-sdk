import { Address, WalletClient } from "viem";
import {
    _deployESIMWalletWithUserOp,
    _getCurrentESIMWalletImplementation
} from "../logic/eSIMWalletFactory.js"
import { KokioSmartAccountClient } from "../types.js";

export class ESIMWalletFactorySubPackage {

    smartAccountClient: KokioSmartAccountClient;
    walletClient: WalletClient;

    constructor(walletClient: WalletClient, smartAccountClient: KokioSmartAccountClient) {
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
