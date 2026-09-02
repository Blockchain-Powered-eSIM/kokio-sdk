import { Address } from "viem";
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
    _requireDeviceIdentifierNotReserved
} from "../logic/registry.js"
import { KokioSmartAccountClient } from "../types.js";

export class RegistrySubPackage {

    client: KokioSmartAccountClient;

    constructor(client: KokioSmartAccountClient) {
        this.client = client;
    }

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

    requireDeviceIdentifierNotReserved (deviceUniqueIdentifier: string) {
        return _requireDeviceIdentifierNotReserved(this.client, deviceUniqueIdentifier);
    }
}
