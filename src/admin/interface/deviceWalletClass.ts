import { Address, Hex, WalletClient } from "viem";
import { _addDeposit, _deployESIMWallet } from "../../logic/admin/deviceWallet.eoa.js";
import {
    _deviceUniqueIdentifier,
    _isValidESIMWallet,
    _canPullETH,
    _getVaultAddress,
    _getOwner,
    _getDeposit,
    _isValidSignature,
    _registry,
    _eSIMWalletFactory,
    _entryPoint,
    _verifier,
} from "../../logic/admin/reads/deviceWallet.reads.js";

/**
 * Thin EOA wrapper around a specific `DeviceWallet` instance. The instance
 * address is bound at construction; `KokioAdmin.setDeviceWalletAddress` swaps it
 * by re-instantiating this SubPackage.
 */
export class AdminDeviceWalletSubPackage {

    walletClient: WalletClient;
    deviceWalletAddress: Address;

    constructor(walletClient: WalletClient, deviceWalletAddress: Address) {
        this.walletClient = walletClient;
        this.deviceWalletAddress = deviceWalletAddress;
    }

    deployESIMWallet(hasAccessToETH: boolean, salt: bigint) {
        return _deployESIMWallet(this.walletClient, this.deviceWalletAddress, hasAccessToETH, salt);
    }

    addDeposit(amount: bigint) {
        return _addDeposit(this.walletClient, this.deviceWalletAddress, amount);
    }

    // Reads: public storage getters and views

    deviceUniqueIdentifier() {
        return _deviceUniqueIdentifier(this.walletClient, this.deviceWalletAddress);
    }

    isValidESIMWallet(eSIMWallet: Address) {
        return _isValidESIMWallet(this.walletClient, this.deviceWalletAddress, eSIMWallet);
    }

    canPullETH(eSIMWallet: Address) {
        return _canPullETH(this.walletClient, this.deviceWalletAddress, eSIMWallet);
    }

    getVaultAddress() {
        return _getVaultAddress(this.walletClient, this.deviceWalletAddress);
    }

    getOwner() {
        return _getOwner(this.walletClient, this.deviceWalletAddress);
    }

    getDeposit() {
        return _getDeposit(this.walletClient, this.deviceWalletAddress);
    }

    isValidSignature(messageHash: Hex, signature: Hex) {
        return _isValidSignature(this.walletClient, this.deviceWalletAddress, messageHash, signature);
    }

    registry() {
        return _registry(this.walletClient, this.deviceWalletAddress);
    }

    eSIMWalletFactory() {
        return _eSIMWalletFactory(this.walletClient, this.deviceWalletAddress);
    }

    entryPoint() {
        return _entryPoint(this.walletClient, this.deviceWalletAddress);
    }

    verifier() {
        return _verifier(this.walletClient, this.deviceWalletAddress);
    }
}
