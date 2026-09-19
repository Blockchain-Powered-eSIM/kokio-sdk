import { Address, WalletClient } from "viem";
import {
    _deployESIMWalletWithUserOp,
    _getCurrentESIMWalletImplementation,
    _getESIMWalletCounterFactualAddress
} from "../logic/eSIMWalletFactory.js"
import { KokioSmartAccountClient } from "../types.js";

export class ESIMWalletFactorySubPackage {

    smartAccountClient: KokioSmartAccountClient;
    walletClient: WalletClient;

    constructor(walletClient: WalletClient, smartAccountClient: KokioSmartAccountClient) {
        this.smartAccountClient = smartAccountClient;
        this.walletClient = walletClient
    }

    /**
     * @deprecated Deploys without binding, so the device wallet does not treat the
     * new eSIM wallet as its own. Use `deviceWallet.deployAndBindESIMWallet`.
     */
    deployESIMWalletWithUserOp (deviceWalletAddress: Address, salt: bigint) {
        return _deployESIMWalletWithUserOp (this.smartAccountClient, deviceWalletAddress, salt);
    }

    /** Address the eSIM wallet for this device wallet and salt deploys to. */
    getCounterFactualAddress (deviceWalletAddress: Address, salt: bigint) {
        return _getESIMWalletCounterFactualAddress(this.smartAccountClient, deviceWalletAddress, salt);
    }

    getCurrentESIMWalletImplementation () {
        return _getCurrentESIMWalletImplementation(this.smartAccountClient);
    }
}
