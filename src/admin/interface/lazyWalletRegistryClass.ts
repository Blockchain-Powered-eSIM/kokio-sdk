import { Address, Hex, WalletClient } from "viem";
import { DataBundleDetails, P256Key } from "../../types.js";
import {
    _batchPopulateHistory,
    _deployLazyWalletAllBatches,
    _deployLazyWalletAndSetESIMIdentifier,
    _deployMoreESIMWalletsForLazyDevice,
    _setHistoryForLazyWallet,
    _setHistoryForLazyWalletAllBatches,
    _switchESIMIdentifierToNewDeviceIdentifier,
    _acceptOwnership,
    _transferOwnershipCall,
    _upgradeCall,
} from "../../logic/admin/lazyWalletRegistry.eoa.js";
import {
    _upgradeManager,
    _eSIMIdentifierToDeviceIdentifier,
    _deviceIdentifierToESIMDetails,
    _eSIMIdentifiersAssociatedWithDeviceIdentifier,
    _eSIMWalletsDeployed,
    _historyEntriesCopied,
    _isDeviceIdentifierReserved,
    _isESIMIdentifierReserved,
    _lazyDeployedESIMWallet,
    _lazyDeploymentSalt,
    _maxESIMWalletsPerCall,
    _maxHistoryEntriesPerCall,
    _owner,
    _pendingOwner,
    _proxiableUUID,
    _upgradeInterfaceVersion,
} from "../../logic/admin/reads/lazyWalletRegistry.reads.js";

/** Thin EOA (eSIMWalletAdmin) wrapper around `LazyWalletRegistry`. */
export class AdminLazyWalletRegistrySubPackage {

    walletClient: WalletClient;

    constructor(walletClient: WalletClient) {
        this.walletClient = walletClient;
    }

    batchPopulateHistory(
        deviceUniqueIdentifiers: Array<string>,
        eSIMUniqueIdentifiers: Array<Array<string>>,
        dataBundleDetails: Array<Array<DataBundleDetails>>
    ) {
        return _batchPopulateHistory(this.walletClient, deviceUniqueIdentifiers, eSIMUniqueIdentifiers, dataBundleDetails);
    }

    /**
     * Deploy a lazy device and all of its eSIM wallets. Sends as many transactions
     * as the device needs and resolves once every wallet exists, so the caller
     * does not deal with the on-chain batching at all.
     *
     * Resumable: call it again with the same arguments (and a deposit of 0) to
     * pick a part-deployed device up from where it stopped.
     *
     * Record all of the device's purchase history before this runs.
     */
    deployLazyWalletAndSetESIMIdentifier(
        deviceOwnerPublicKey: P256Key,
        deviceUniqueIdentifier: string,
        salt: bigint,
        depositAmount: bigint,
        maxWallets?: bigint
    ) {
        return _deployLazyWalletAllBatches(this.walletClient, deviceOwnerPublicKey, deviceUniqueIdentifier, salt, depositAmount, maxWallets);
    }

    /**
     * Copy an eSIM's whole purchase history onto its wallet, over as many
     * transactions as it takes. Resumable, and safe to run while the device's
     * other eSIM wallets are still being deployed.
     */
    setHistoryForLazyWallet(eSIMIdentifier: string, maxEntries?: bigint) {
        return _setHistoryForLazyWalletAllBatches(this.walletClient, eSIMIdentifier, maxEntries);
    }

    switchESIMIdentifierToNewDeviceIdentifier(
        eSIMIdentifier: string,
        oldDeviceIdentifier: string,
        newDeviceIdentifier: string
    ) {
        return _switchESIMIdentifierToNewDeviceIdentifier(this.walletClient, eSIMIdentifier, oldDeviceIdentifier, newDeviceIdentifier);
    }

    // Single-transaction calls, mirroring the contract one for one. The paginated
    // versions above are the ones to reach for; these are here for a caller that
    // wants to drive the batching itself, and each returns a transaction hash
    // rather than waiting for a receipt.

    deployLazyWalletFirstBatch(
        deviceOwnerPublicKey: P256Key,
        deviceUniqueIdentifier: string,
        salt: bigint,
        depositAmount: bigint,
        maxWallets: bigint
    ) {
        return _deployLazyWalletAndSetESIMIdentifier(this.walletClient, deviceOwnerPublicKey, deviceUniqueIdentifier, salt, depositAmount, maxWallets);
    }

    deployMoreESIMWalletsForLazyDevice(deviceUniqueIdentifier: string, maxWallets: bigint) {
        return _deployMoreESIMWalletsForLazyDevice(this.walletClient, deviceUniqueIdentifier, maxWallets);
    }

    setHistoryForLazyWalletBatch(eSIMIdentifier: string, maxEntries: bigint) {
        return _setHistoryForLazyWallet(this.walletClient, eSIMIdentifier, maxEntries);
    }

    // Reads: public storage getters

    upgradeManager() {
        return _upgradeManager(this.walletClient);
    }

    eSIMIdentifierToDeviceIdentifier(eSIMIdentifier: string) {
        return _eSIMIdentifierToDeviceIdentifier(this.walletClient, eSIMIdentifier);
    }

    MAX_ESIM_WALLETS_PER_CALL() {
        return _maxESIMWalletsPerCall(this.walletClient);
    }

    MAX_HISTORY_ENTRIES_PER_CALL() {
        return _maxHistoryEntriesPerCall(this.walletClient);
    }

    /** Deploy cursor. Non-zero exactly when the lazy route ran this device's first batch. */
    eSIMWalletsDeployed(deviceIdentifier: string) {
        return _eSIMWalletsDeployed(this.walletClient, deviceIdentifier);
    }

    lazyDeploymentSalt(deviceIdentifier: string) {
        return _lazyDeploymentSalt(this.walletClient, deviceIdentifier);
    }

    lazyDeployedESIMWallet(eSIMIdentifier: string) {
        return _lazyDeployedESIMWallet(this.walletClient, eSIMIdentifier);
    }

    /** History cursor, per eSIM. */
    historyEntriesCopied(eSIMIdentifier: string) {
        return _historyEntriesCopied(this.walletClient, eSIMIdentifier);
    }

    isDeviceIdentifierReserved(deviceIdentifier: string) {
        return _isDeviceIdentifierReserved(this.walletClient, deviceIdentifier);
    }

    isESIMIdentifierReserved(eSIMIdentifier: string) {
        return _isESIMIdentifierReserved(this.walletClient, eSIMIdentifier);
    }

    // Array-backed getters take an element index and return one entry - iterate
    // indices to read the full list (there is no on-chain full-array getter).
    deviceIdentifierToESIMDetails(deviceIdentifier: string, eSIMIdentifier: string, index: bigint) {
        return _deviceIdentifierToESIMDetails(this.walletClient, deviceIdentifier, eSIMIdentifier, index);
    }

    eSIMIdentifiersAssociatedWithDeviceIdentifier(deviceIdentifier: string, index: bigint) {
        return _eSIMIdentifiersAssociatedWithDeviceIdentifier(this.walletClient, deviceIdentifier, index);
    }

    owner() {
        return _owner(this.walletClient);
    }

    pendingOwner() {
        return _pendingOwner(this.walletClient);
    }

    proxiableUUID() {
        return _proxiableUUID(this.walletClient);
    }

    upgradeInterfaceVersion() {
        return _upgradeInterfaceVersion(this.walletClient);
    }

    acceptOwnership() {
        return _acceptOwnership(this.walletClient);
    }

    // Owner payloads: hand the result to `protocolAdmin.schedule`

    transferOwnershipCall(newOwner: Address) {
        return _transferOwnershipCall(this.walletClient, newOwner);
    }

    upgradeCall(newImplementation: Address, data?: Hex) {
        return _upgradeCall(this.walletClient, newImplementation, data);
    }
}
