import { Address, Hex, WalletClient } from "viem";
import {
    _addDeposit,
    _addESIMWallet,
    _canPullFunds,
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
    _sendUserOperation,
    _toggleAccessToFunds,
    _transferOwnership,
    _verifier,
    _withdrawDepositTo
} from "../logic/deviceWallet.js"
import { Call, KokioSmartAccountClient, P256Key } from "../types.js";

export class DeviceWalletSubPackage {

    smartAccountClient: KokioSmartAccountClient;
    walletClient: WalletClient;
    address;

    constructor(walletClient: WalletClient, smartAccountClient: KokioSmartAccountClient, address: Address) {
        this.smartAccountClient = smartAccountClient;
        this.walletClient = walletClient;
        this.address = address;
    }

    sendUserOperation (calls: Call[]) {
        return _sendUserOperation(this.smartAccountClient, calls);
    }

    addDeposit (amount: bigint) {
        return _addDeposit(this.smartAccountClient, this.address, amount);
    }

    addESIMWallet (eSIMWalletAddress: Address) {
        return _addESIMWallet(this.smartAccountClient, this.address, eSIMWalletAddress);
    }

    getVaultAddress () {
        return _getVaultAddress(this.smartAccountClient, this.address);
    }

    removeESIMWallet (eSIMWalletAddress: Address, callBackETH: boolean) {
        return _removeESIMWallet(this.smartAccountClient, this.address, eSIMWalletAddress, callBackETH);
    }

    toggleAccessToFunds (eSIMWalletAddress: Address, hasAccessToFunds: boolean) {
        return _toggleAccessToFunds(this.smartAccountClient, this.address, eSIMWalletAddress, hasAccessToFunds);
    }

    transferOwnership (newOwner: P256Key) {
        return _transferOwnership(this.smartAccountClient, this.address, newOwner);
    }

    withdrawDepositTo (withdrawAddress: Address, amount: bigint) {
        return _withdrawDepositTo(this.smartAccountClient, this.address, withdrawAddress, amount);
    }

    // Reads

    canPullFunds (eSIMWalletAddress: Address) {
        return _canPullFunds(this.smartAccountClient, this.address, eSIMWalletAddress);
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
