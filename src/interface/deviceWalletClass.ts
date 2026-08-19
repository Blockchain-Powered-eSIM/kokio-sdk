import { Address, Hex, WalletClient } from "viem";
import {
    _addDeposit,
    _addESIMWallet,
    _canPullETH,
    _deviceUniqueIdentifier,
    _entryPoint,
    _eSIMWalletFactory,
    _getDeposit,
    _getOwner,
    _getVaultAddress,
    _isValidESIMWallet,
    _isValidSignature,
    _registry,
    _removeESIMWallet,
    _toggleAccessToETH,
    _transferOwnership,
    _verifier,
    _withdrawDepositTo
} from "../logic/deviceWallet.js"
import { KokioSmartAccountClient, P256Key } from "../types.js";

export class DeviceWalletSubPackage {

    smartAccountClient: KokioSmartAccountClient;
    walletClient;
    address;

    constructor(walletClient: WalletClient, smartAccountClient: KokioSmartAccountClient, address: Address) {
        this.smartAccountClient = smartAccountClient;
        this.walletClient = walletClient;
        this.address = address;
    }

    addDeposit (amount: bigint) {
        return _addDeposit(this.smartAccountClient, this.address, amount);
    }

    addESIMWallet (eSIMWalletAddress: Address, hasAccessToETH: boolean) {
        return _addESIMWallet(this.smartAccountClient, this.address, eSIMWalletAddress, hasAccessToETH);
    }

    getVaultAddress () {
        return _getVaultAddress(this.smartAccountClient, this.address);
    }

    removeESIMWallet (eSIMWalletAddress: Address, hasAccessToETH: boolean) {
        return _removeESIMWallet(this.smartAccountClient, this.address, eSIMWalletAddress, hasAccessToETH);
    }

    toggleAccessToETH (eSIMWalletAddress: Address, hasAccessToETH: boolean) {
        return _toggleAccessToETH(this.smartAccountClient, this.address, eSIMWalletAddress, hasAccessToETH);
    }

    transferOwnership (newOwner: P256Key) {
        return _transferOwnership(this.smartAccountClient, this.address, newOwner);
    }

    withdrawDepositTo (withdrawAddress: Address, amount: bigint) {
        return _withdrawDepositTo(this.smartAccountClient, this.address, withdrawAddress, amount);
    }

    // Reads

    canPullETH (eSIMWalletAddress: Address) {
        return _canPullETH(this.smartAccountClient, this.address, eSIMWalletAddress);
    }

    deviceUniqueIdentifier () {
        return _deviceUniqueIdentifier(this.smartAccountClient, this.address);
    }

    entryPoint () {
        return _entryPoint(this.smartAccountClient, this.address);
    }

    eSIMWalletFactory () {
        return _eSIMWalletFactory(this.smartAccountClient, this.address);
    }

    getDeposit () {
        return _getDeposit(this.smartAccountClient, this.address);
    }

    getOwner () {
        return _getOwner (this.walletClient, this.address);
    }

    isValidESIMWallet (eSIMWalletAddress: Address) {
        return _isValidESIMWallet(this.smartAccountClient, this.address, eSIMWalletAddress);
    }

    isValidSignature (messageHash: Hex, signature: Hex) {
        return _isValidSignature(this.smartAccountClient, this.address, messageHash, signature);
    }

    registry () {
        return _registry(this.smartAccountClient, this.address);
    }

    verifier () {
        return _verifier(this.smartAccountClient, this.address);
    }
}
