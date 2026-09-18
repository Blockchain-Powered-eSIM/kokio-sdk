import { Address, Hex } from "viem";
import {
    _bindESIMWallet,
    _toggleESIMWalletStandbyStatus,
    _isDeviceIdentifierAlreadyUsed,
    _paused,
    _requireNotPaused,
    _isESIMWalletValid,
    _isESIMWalletOnStandby,
    _isDeviceWalletValid,
    _uniqueIdentifierToDeviceWallet,
    _isESIMIdentifierClaimed,
    _eSIMWalletForIdentifier,
    _defaultPriceCapUSDCents,
    _paymentAdapter,
    _usedPaymentReferences,
    _requireLazyHistoryCopied,
    _requireDeviceIdentifierNotReserved
} from "../logic/registry.js"
import { KokioSmartAccountClient } from "../types.js";

export class RegistrySubPackage {

    client: KokioSmartAccountClient;

    constructor(client: KokioSmartAccountClient) {
        this.client = client;
    }

    /**
     * Record in the registry that this device wallet holds the eSIM wallet.
     *
     * Registry side only: the device wallet itself still does not treat the eSIM
     * wallet as its own (`isValidESIMWallet` stays false, so it cannot manage it or
     * grant it fund access). To take on an eSIM wallet use `deviceWallet.addESIMWallet`,
     * which writes both sides.
     */
    bindESIMWallet (eSIMWalletAddress: Address) {
        return _bindESIMWallet(this.client, eSIMWalletAddress);
    }

    toggleESIMWalletStandbyStatus (eSIMWalletAddress: Address, isOnStandby: boolean) {
        return _toggleESIMWalletStandbyStatus(this.client, eSIMWalletAddress, isOnStandby);
    }

    // Reads

    isDeviceIdentifierAlreadyUsed (deviceUniqueIdentifier: string) {
        return _isDeviceIdentifierAlreadyUsed(this.client, deviceUniqueIdentifier);
    }

    paused () {
        return _paused(this.client);
    }

    requireNotPaused () {
        return _requireNotPaused(this.client);
    }

    isESIMWalletValid (eSIMWalletAddress: Address) {
        return _isESIMWalletValid(this.client, eSIMWalletAddress);
    }

    isESIMWalletOnStandby (eSIMWalletAddress: Address) {
        return _isESIMWalletOnStandby(this.client, eSIMWalletAddress);
    }

    isDeviceWalletValid (deviceWalletAddress: Address) {
        return _isDeviceWalletValid(this.client, deviceWalletAddress);
    }

    uniqueIdentifierToDeviceWallet (deviceUniqueIdentifier: string) {
        return _uniqueIdentifierToDeviceWallet(this.client, deviceUniqueIdentifier);
    }

    isESIMIdentifierClaimed (eSIMUniqueIdentifier: string) {
        return _isESIMIdentifierClaimed(this.client, eSIMUniqueIdentifier);
    }

    eSIMWalletForIdentifier (eSIMUniqueIdentifier: string) {
        return _eSIMWalletForIdentifier(this.client, eSIMUniqueIdentifier);
    }

    defaultPriceCapUSDCents () {
        return _defaultPriceCapUSDCents(this.client);
    }

    paymentAdapter () {
        return _paymentAdapter(this.client);
    }

    usedPaymentReferences (scopedReference: Hex) {
        return _usedPaymentReferences(this.client, scopedReference);
    }

    requireLazyHistoryCopied (eSIMWallet: Address) {
        return _requireLazyHistoryCopied(this.client, eSIMWallet);
    }

    requireDeviceIdentifierNotReserved (deviceUniqueIdentifier: string) {
        return _requireDeviceIdentifierNotReserved(this.client, deviceUniqueIdentifier);
    }
}
