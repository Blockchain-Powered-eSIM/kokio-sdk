import {
    Address,
    BaseError,
    ContractFunctionRevertedError,
    Hex,
    PublicActions,
    WalletClient,
    isAddressEqual,
    parseEventLogs,
    publicActions,
} from "viem";
import { _getChainSpecificConstants } from "../constants.js";
import {
    BatchSizeOutOfRangeError,
    DepositOnResumeError,
    ESIMWalletNotLazyDeployedError,
    MissingBatchEventError,
    MissingEOAWalletError,
    StalledBatchError,
    writeContractOrThrow,
} from "../errors.js";
import { LazyWalletRegistry, Registry } from "../../abis/index.js";
import { _eSIMWalletsDeployed, _lazyDeployedESIMWallet } from "./reads/lazyWalletRegistry.reads.js";
import type {
    DataBundleDetails,
    LazyDeployment,
    LazyDeploymentBatch,
    LazyHistoryBatch,
    LazyHistoryCopy,
    OwnerCall,
    P256Key,
} from "../../types.js";

// Admin-EOA logic for `LazyWalletRegistry`. Every function here is
// `onlyESIMWalletAdmin` on chain, so they can only succeed from the admin EOA -
// a device-wallet userOp (whose sender is the smart account) always reverts.
// This is why they belong on the EOA surface rather than the mobile userOp one.
//
// Deployment and the history copy are both paginated on chain. The thin wrappers
// send one batch each; the two `AllBatches` functions below run a device or an
// eSIM to completion and are what the backend should normally call.

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;

type ReadWriteClient = WalletClient & PublicActions;

/**
 * The contract's own caps, mirrored here because they are `constant` on chain and
 * reading them would cost a round trip on every call. The fork tier checks these
 * against the live deployment, so an upgrade that moved one would fail there
 * rather than turning every call into a reverted transaction.
 */
export const MAX_ESIM_WALLETS_PER_CALL = 20n;
export const MAX_HISTORY_ENTRIES_PER_CALL = 50n;

/**
 * Default batch sizes, both below the caps above.
 *
 * A continuation call costs about 28,000 gas before it deploys anything, against
 * roughly 556,000 per eSIM wallet, so a smaller batch buys headroom for almost
 * nothing: running a 45 eSIM device at 10 rather than 20 costs about 0.4% more
 * gas in total. That headroom matters because a full batch of 20 measures between
 * 9.3M and 11.8M gas depending on identifier length and storage warmth, which is
 * uncomfortably close to a per-transaction gas ceiling.
 */
export const DEFAULT_ESIM_WALLETS_PER_CALL = 10n;
export const DEFAULT_HISTORY_ENTRIES_PER_CALL = 25n;

const _resolve = async (client: WalletClient) => {
    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    return _getChainSpecificConstants(chainID, rpcURL);
}

// ---------------------------------------------------------------------------
// One transaction each, mirroring the contract
// ---------------------------------------------------------------------------

/** Record fiat/lazy purchase history for a batch of devices. `onlyESIMWalletAdmin`. */
export const _batchPopulateHistory = async (
    client: WalletClient,
    deviceUniqueIdentifiers: Array<string>,
    eSIMUniqueIdentifiers: Array<Array<string>>,
    dataBundleDetails: Array<Array<DataBundleDetails>>
) => {

    const values = await _resolve(client);

    if (!client.account) throw new MissingEOAWalletError();

    return writeContractOrThrow(client, {
        address: values.factoryAddresses.LAZY_WALLET_REGISTRY,
        chain: values.chain,
        account: client.account.address,
        abi: LazyWalletRegistry,
        functionName: 'batchPopulateHistory',
        args: [deviceUniqueIdentifiers, eSIMUniqueIdentifiers, dataBundleDetails]
    });
}

/**
 * Materialise a lazily-provisioned device wallet and the first batch of its eSIMs
 * on chain. `onlyESIMWalletAdmin`, `payable`: the contract requires
 * `depositAmount == msg.value`, so `value` is set to `depositAmount` here.
 *
 * One transaction. `maxWallets` caps how many eSIM wallets it deploys, and the
 * contract refuses anything above `MAX_ESIM_WALLETS_PER_CALL` rather than
 * clamping it. Prefer `_deployLazyWalletAllBatches`, which finishes the device.
 */
export const _deployLazyWalletAndSetESIMIdentifier = async (
    client: WalletClient,
    deviceOwnerPublicKey: P256Key,
    deviceUniqueIdentifier: string,
    salt: bigint,
    depositAmount: bigint,
    maxWallets: bigint
) => {

    const values = await _resolve(client);

    if (!client.account) throw new MissingEOAWalletError();

    return writeContractOrThrow(client, {
        address: values.factoryAddresses.LAZY_WALLET_REGISTRY,
        chain: values.chain,
        account: client.account.address,
        abi: LazyWalletRegistry,
        functionName: 'deployLazyWalletAndSetESIMIdentifier',
        args: [deviceOwnerPublicKey, deviceUniqueIdentifier, salt, depositAmount, maxWallets],
        value: depositAmount
    });
}

/**
 * Deploy the next batch of eSIM wallets for a device the lazy route already
 * started. `onlyESIMWalletAdmin`.
 *
 * One transaction. The contract reads its position from a cursor, so a dropped
 * transaction is retried by repeating the identical call. It reverts
 * `AllESIMWalletsDeployed` once nothing is left, which is the terminal condition
 * rather than a failure.
 */
export const _deployMoreESIMWalletsForLazyDevice = async (
    client: WalletClient,
    deviceUniqueIdentifier: string,
    maxWallets: bigint
) => {

    const values = await _resolve(client);

    if (!client.account) throw new MissingEOAWalletError();

    return writeContractOrThrow(client, {
        address: values.factoryAddresses.LAZY_WALLET_REGISTRY,
        chain: values.chain,
        account: client.account.address,
        abi: LazyWalletRegistry,
        functionName: 'deployMoreESIMWalletsForLazyDevice',
        args: [deviceUniqueIdentifier, maxWallets]
    });
}

/**
 * Copy the next batch of an eSIM's stored purchase history onto its deployed
 * wallet. `onlyESIMWalletAdmin`.
 *
 * One transaction, with its own cursor per eSIM. Reverts `HistoryAlreadyCopied`
 * once nothing is left. Prefer `_setHistoryForLazyWalletAllBatches`.
 */
export const _setHistoryForLazyWallet = async (
    client: WalletClient,
    eSIMIdentifier: string,
    maxEntries: bigint
) => {

    const values = await _resolve(client);

    if (!client.account) throw new MissingEOAWalletError();

    return writeContractOrThrow(client, {
        address: values.factoryAddresses.LAZY_WALLET_REGISTRY,
        chain: values.chain,
        account: client.account.address,
        abi: LazyWalletRegistry,
        functionName: 'setHistoryForLazyWallet',
        args: [eSIMIdentifier, maxEntries]
    });
}

/** Re-point an eSIM identifier from an old device to a new one. `onlyESIMWalletAdmin`. */
export const _switchESIMIdentifierToNewDeviceIdentifier = async (
    client: WalletClient,
    eSIMIdentifier: string,
    oldDeviceIdentifier: string,
    newDeviceIdentifier: string
) => {

    const values = await _resolve(client);

    if (!client.account) throw new MissingEOAWalletError();

    return writeContractOrThrow(client, {
        address: values.factoryAddresses.LAZY_WALLET_REGISTRY,
        chain: values.chain,
        account: client.account.address,
        abi: LazyWalletRegistry,
        functionName: 'switchESIMIdentifierToNewDeviceIdentifier',
        args: [eSIMIdentifier, oldDeviceIdentifier, newDeviceIdentifier]
    });
}

// ---------------------------------------------------------------------------
// Reading a batch back
// ---------------------------------------------------------------------------

// `writeContract` returns a hash, not the function's return values, so how much
// is left comes from the event each batch emits rather than from the call.
const _batchEvent = async <T>(
    client: ReadWriteClient,
    lazyRegistryAddress: Address,
    hash: Hex,
    eventName: "LazyESIMWalletsDeployed" | "LazyHistoryCopied"
): Promise<T> => {

    const receipt = await client.waitForTransactionReceipt({ hash });

    const logs = parseEventLogs({
        abi: LazyWalletRegistry,
        eventName,
        logs: receipt.logs.filter((log) => isAddressEqual(log.address, lazyRegistryAddress)),
    });

    if (logs.length === 0) throw new MissingBatchEventError(eventName, hash);

    return logs[0].args as T;
}

/**
 * Whether a call hit its terminal condition. Both paginated calls revert when
 * there is nothing left rather than returning quietly, so a simulation is the
 * only way to tell "already finished" from "more to do" without paying for a
 * transaction that fails.
 */
const _isFinished = async (
    client: ReadWriteClient,
    request: Parameters<ReadWriteClient["simulateContract"]>[0],
    terminalError: string
): Promise<boolean> => {

    try {
        await client.simulateContract(request);
        return false;
    } catch (err) {
        if (err instanceof BaseError) {
            const revert = err.walk((e) => e instanceof ContractFunctionRevertedError);
            if (revert instanceof ContractFunctionRevertedError && revert.data?.errorName === terminalError) {
                return true;
            }
        }
        throw err;
    }
}

// ---------------------------------------------------------------------------
// Run a device or an eSIM to completion
// ---------------------------------------------------------------------------

/**
 * Deploy a lazy device and every one of its eSIM wallets, over as many
 * transactions as that takes. `onlyESIMWalletAdmin`.
 *
 * Resumable. A device that is part-deployed, because a batch was dropped or an
 * earlier call threw, is continued from its cursor instead of being restarted,
 * so retrying is just calling this again with the same arguments. Pass a deposit
 * of 0 on a retry: only the first batch is payable and it already took one.
 *
 * All of a device's purchase history has to be recorded before this runs. The
 * first batch creates the device wallet, and `batchPopulateHistory` refuses any
 * device that has one.
 *
 * @param maxWallets eSIM wallets per transaction, 1 to `MAX_ESIM_WALLETS_PER_CALL`.
 */
export const _deployLazyWalletAllBatches = async (
    client: WalletClient,
    deviceOwnerPublicKey: P256Key,
    deviceUniqueIdentifier: string,
    salt: bigint,
    depositAmount: bigint,
    maxWallets: bigint = DEFAULT_ESIM_WALLETS_PER_CALL
): Promise<LazyDeployment> => {

    const values = await _resolve(client);

    if (!client.account) throw new MissingEOAWalletError();

    const publicClient = client.extend(publicActions);
    const lazyRegistryAddress = values.factoryAddresses.LAZY_WALLET_REGISTRY;

    if (maxWallets < 1n || maxWallets > MAX_ESIM_WALLETS_PER_CALL) {
        throw new BatchSizeOutOfRangeError("maxWallets", maxWallets, MAX_ESIM_WALLETS_PER_CALL);
    }

    const alreadyDeployed = await _eSIMWalletsDeployed(client, deviceUniqueIdentifier);
    const batches: LazyDeploymentBatch[] = [];

    let deviceWallet: Address;
    let outstanding: boolean;

    if (alreadyDeployed === 0n) {
        const hash = await _deployLazyWalletAndSetESIMIdentifier(
            client,
            deviceOwnerPublicKey,
            deviceUniqueIdentifier,
            salt,
            depositAmount,
            maxWallets
        );

        const first = await _batchEvent<{
            _deviceWallet: Address;
            _eSIMWallets: readonly Address[];
            _eSIMUniqueIdentifiers: readonly string[];
            _remaining: bigint;
        }>(publicClient, lazyRegistryAddress, hash, "LazyESIMWalletsDeployed");

        deviceWallet = first._deviceWallet;
        outstanding = first._remaining > 0n;
        batches.push({
            hash,
            eSIMWallets: first._eSIMWallets,
            eSIMIdentifiers: first._eSIMUniqueIdentifiers,
            remaining: first._remaining,
        });
    }
    else {
        if (depositAmount !== 0n) throw new DepositOnResumeError(deviceUniqueIdentifier, depositAmount);

        deviceWallet = await publicClient.readContract({
            address: values.factoryAddresses.REGISTRY,
            abi: Registry,
            functionName: "uniqueIdentifierToDeviceWallet",
            args: [deviceUniqueIdentifier]
        }) as Address;

        const finished = await _isFinished(publicClient, {
            address: lazyRegistryAddress,
            abi: LazyWalletRegistry,
            functionName: "deployMoreESIMWalletsForLazyDevice",
            args: [deviceUniqueIdentifier, maxWallets],
            account: client.account.address,
        }, "AllESIMWalletsDeployed");

        if (finished) {
            return { deviceWallet, eSIMWallets: [], eSIMIdentifiers: [], batches: [], alreadyComplete: true };
        }
        outstanding = true;
    }

    while (outstanding) {
        const hash = await _deployMoreESIMWalletsForLazyDevice(client, deviceUniqueIdentifier, maxWallets);

        const next = await _batchEvent<{
            _eSIMWallets: readonly Address[];
            _eSIMUniqueIdentifiers: readonly string[];
            _remaining: bigint;
        }>(publicClient, lazyRegistryAddress, hash, "LazyESIMWalletsDeployed");

        if (next._eSIMWallets.length === 0) throw new StalledBatchError(hash, next._remaining);

        batches.push({
            hash,
            eSIMWallets: next._eSIMWallets,
            eSIMIdentifiers: next._eSIMUniqueIdentifiers,
            remaining: next._remaining,
        });
        outstanding = next._remaining > 0n;
    }

    return {
        deviceWallet,
        eSIMWallets: batches.flatMap((batch) => [...batch.eSIMWallets]),
        eSIMIdentifiers: batches.flatMap((batch) => [...batch.eSIMIdentifiers]),
        batches,
        alreadyComplete: false,
    };
}

/**
 * Copy an eSIM's whole stored purchase history onto its wallet, over as many
 * transactions as that takes. `onlyESIMWalletAdmin`.
 *
 * Resumable for the same reason as the deployment: the cursor lives on chain, so
 * a partly copied eSIM is continued rather than restarted.
 *
 * The history cursor is per eSIM and the deploy cursor is per device, so this can
 * run against an eSIM whose wallet has landed while its siblings are still
 * undeployed.
 *
 * @param maxEntries entries per transaction, 1 to `MAX_HISTORY_ENTRIES_PER_CALL`.
 */
export const _setHistoryForLazyWalletAllBatches = async (
    client: WalletClient,
    eSIMIdentifier: string,
    maxEntries: bigint = DEFAULT_HISTORY_ENTRIES_PER_CALL
): Promise<LazyHistoryCopy> => {

    const values = await _resolve(client);

    if (!client.account) throw new MissingEOAWalletError();

    const publicClient = client.extend(publicActions);
    const lazyRegistryAddress = values.factoryAddresses.LAZY_WALLET_REGISTRY;

    if (maxEntries < 1n || maxEntries > MAX_HISTORY_ENTRIES_PER_CALL) {
        throw new BatchSizeOutOfRangeError("maxEntries", maxEntries, MAX_HISTORY_ENTRIES_PER_CALL);
    }

    // The same lookup the contract authorises on. Checking it here turns a
    // reverted transaction into a typed error.
    const eSIMWallet = await _lazyDeployedESIMWallet(client, eSIMIdentifier);
    if (eSIMWallet === ZERO_ADDRESS) throw new ESIMWalletNotLazyDeployedError(eSIMIdentifier);

    const finished = await _isFinished(publicClient, {
        address: lazyRegistryAddress,
        abi: LazyWalletRegistry,
        functionName: "setHistoryForLazyWallet",
        args: [eSIMIdentifier, maxEntries],
        account: client.account.address,
    }, "HistoryAlreadyCopied");

    if (finished) return { eSIMWallet, copied: 0n, batches: [], alreadyComplete: true };

    const batches: LazyHistoryBatch[] = [];
    let copied = 0n;
    let outstanding = true;

    while (outstanding) {
        const hash = await _setHistoryForLazyWallet(client, eSIMIdentifier, maxEntries);

        const batch = await _batchEvent<{
            _copied: bigint;
            _remaining: bigint;
        }>(publicClient, lazyRegistryAddress, hash, "LazyHistoryCopied");

        if (batch._copied === 0n) throw new StalledBatchError(hash, batch._remaining);

        batches.push({ hash, copied: batch._copied, remaining: batch._remaining });
        copied += batch._copied;
        outstanding = batch._remaining > 0n;
    }

    return { eSIMWallet, copied, batches, alreadyComplete: false };
}

// ---------------------------------------------------------------------------
// Owner payloads - only reachable through schedule
// ---------------------------------------------------------------------------

// Both are `onlyOwner`, and on the live deployment the owner is the timelock, so
// they exist as something to schedule rather than to send. Each returns the
// `OwnerCall` to hand to `protocolAdmin.schedule`.

/**
 * Offer ownership to a new address. Pass the result to `schedule`.
 *
 * Ownable2Step, so the offer changes nothing until the named address calls
 * `acceptOwnership`. Until then the current owner keeps every power.
 */
export const _transferOwnershipCall = async (client: WalletClient, newOwner: Address): Promise<OwnerCall> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return {
        address: values.factoryAddresses.LAZY_WALLET_REGISTRY,
        abi: LazyWalletRegistry,
        functionName: 'transferOwnership',
        args: [newOwner],
    };
}

/**
 * Point the proxy at a new implementation. Builds `upgradeToAndCall`. Pass the
 * result to `schedule`.
 *
 * This contract holds every fiat user's unclaimed purchase history, so a layout
 * change here strands data that has no other copy. Diff the storage layout
 * before scheduling. `data` runs on the proxy straight after the swap and is
 * where a `reinitializer` goes.
 */
export const _upgradeCall = async (client: WalletClient, newImplementation: Address, data: Hex = '0x'): Promise<OwnerCall> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return {
        address: values.factoryAddresses.LAZY_WALLET_REGISTRY,
        abi: LazyWalletRegistry,
        functionName: 'upgradeToAndCall',
        args: [newImplementation, data],
    };
}

/**
 * Take ownership after a `transferOwnership` named this client. `msg.sender`
 * must equal `pendingOwner`, so the `client` is the incoming owner.
 *
 * Where the incoming owner is the timelock, use
 * `protocolAdmin.acceptOwnershipBatch` instead, which accepts for every contract
 * at once.
 */
export const _acceptOwnership = async (client: WalletClient) => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    if (!client.account) throw new MissingEOAWalletError();

    return writeContractOrThrow(client, {
        address: values.factoryAddresses.LAZY_WALLET_REGISTRY,
        chain: values.chain,
        account: client.account.address,
        abi: LazyWalletRegistry,
        functionName: 'acceptOwnership',
        args: []
    });
}
