import { BaseError, ContractFunctionRevertedError, decodeErrorResult, Hex, isHex, WalletClient } from "viem";
import {
    DeviceWallet,
    DeviceWalletFactory,
    ESIMWallet,
    ESIMWalletFactory,
    LazyWalletRegistry,
    P256Verifier,
    Registry,
    RegistryHelper,
} from "../abis/index.js";

/**
 * Base class for every error the Kokio SDK throws deliberately. Consumers can
 * `instanceof KokioError` to distinguish SDK-originated failures from viem /
 * bundler / network errors, and switch on `code` for programmatic handling.
 */
export class KokioError extends Error {
    readonly code: string;

    constructor(code: string, message: string) {
        super(message);
        this.name = new.target.name;
        this.code = code;
        // Restore the prototype chain when compiling down to ES5 targets.
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

/** A required value was null, undefined, or empty. */
export class NullOrUndefinedValueError extends KokioError {
    constructor(message = "Null or undefined value provided") {
        super("NULL_OR_UNDEFINED_VALUE", message);
    }
}

/** The client has no smart-wallet (ERC-4337) account associated. */
export class MissingSmartWalletError extends KokioError {
    constructor(message = "Client does not have a smart wallet account associated") {
        super("MISSING_SMART_WALLET", message);
    }
}

/** The client has no EOA account associated. */
export class MissingEOAWalletError extends KokioError {
    constructor(message = "Client does not have an EOA wallet associated") {
        super("MISSING_EOA_WALLET", message);
    }
}

/** No client/signer instance was supplied where one was required. */
export class InvalidClientError extends KokioError {
    constructor(message = "Invalid Signer or Provider instance") {
        super("INVALID_CLIENT", message);
    }
}

/** The requested chain id is not known to the SDK at all. */
export class UnsupportedChainError extends KokioError {
    constructor(chainID: number) {
        super(
            "UNSUPPORTED_CHAIN",
            `Unsupported chain id ${chainID}. Kokio SDK has no configuration for this chain.`,
        );
    }
}

/** The chain is known but its factory address book is still '0x' placeholders. */
export class UnconfiguredChainError extends KokioError {
    constructor(chainID: number) {
        super(
            "UNCONFIGURED_CHAIN",
            `Chain id ${chainID} is not yet configured (factory addresses are '0x' placeholders). ` +
                `Deploy the contracts and populate its address book before using this chain.`,
        );
    }
}

/**
 * The off-chain counterfactual address diverged from the factory's on-chain
 * `getCounterFactualAddress` view - a signal that the pinned BeaconProxy
 * bytecode or CREATE2 encoding has drifted from the deployed contracts.
 */
export class CounterfactualMismatchError extends KokioError {
    readonly offChain: Hex;
    readonly onChain: Hex;

    constructor(offChain: Hex, onChain: Hex) {
        super(
            "COUNTERFACTUAL_MISMATCH",
            `Counterfactual address mismatch: SDK computed ${offChain} but the factory ` +
                `returned ${onChain}. The pinned BeaconProxy bytecode or CREATE2 encoding ` +
                `is out of sync with the deployed contracts.`,
        );
        this.offChain = offChain;
        this.onChain = onChain;
    }
}

/**
 * A batch size outside what the contract accepts. Both paginated calls refuse a
 * request above their cap rather than clamping it, so this is caught locally to
 * save the caller a reverted transaction.
 */
export class BatchSizeOutOfRangeError extends KokioError {
    readonly requested: bigint;
    readonly max: bigint;

    constructor(what: string, requested: bigint, max: bigint) {
        super(
            "BATCH_SIZE_OUT_OF_RANGE",
            `${what} must be between 1 and ${max}, got ${requested}.`,
        );
        this.requested = requested;
        this.max = max;
    }
}

/**
 * A deposit was passed to a lazy deployment that turned out to be a resume. Only
 * the first batch is payable and it already took the deposit, so carrying on
 * would fund the device with less than the caller asked for.
 */
export class DepositOnResumeError extends KokioError {
    readonly deviceUniqueIdentifier: string;
    readonly depositAmount: bigint;

    constructor(deviceUniqueIdentifier: string, depositAmount: bigint) {
        super(
            "DEPOSIT_ON_RESUME",
            `Device ${deviceUniqueIdentifier} is already part-deployed, so its deposit was taken by ` +
                `the first batch. Retry with a deposit of 0 rather than ${depositAmount}.`,
        );
        this.deviceUniqueIdentifier = deviceUniqueIdentifier;
        this.depositAmount = depositAmount;
    }
}

/**
 * History was aimed at an eSIM this registry never deployed a wallet for. That
 * lookup is the whole authorisation on chain, so it cannot be worked around.
 */
export class ESIMWalletNotLazyDeployedError extends KokioError {
    readonly eSIMIdentifier: string;

    constructor(eSIMIdentifier: string) {
        super(
            "ESIM_WALLET_NOT_LAZY_DEPLOYED",
            `No lazily deployed eSIM wallet for identifier ${eSIMIdentifier}.`,
        );
        this.eSIMIdentifier = eSIMIdentifier;
    }
}

/**
 * A batch landed but its receipt carried no event from the lazy registry. The
 * loop reads its position from that event, so it cannot continue without one.
 */
export class MissingBatchEventError extends KokioError {
    readonly hash: Hex;

    constructor(eventName: string, hash: Hex) {
        super(
            "MISSING_BATCH_EVENT",
            `Transaction ${hash} emitted no ${eventName} event from the lazy registry.`,
        );
        this.hash = hash;
    }
}

/**
 * A batch reported work outstanding but did none of it. Nothing on chain should
 * produce this; it stops the loop rather than letting it spin.
 */
export class StalledBatchError extends KokioError {
    readonly hash: Hex;
    readonly remaining: bigint;

    constructor(hash: Hex, remaining: bigint) {
        super(
            "STALLED_BATCH",
            `Transaction ${hash} made no progress with ${remaining} still outstanding.`,
        );
        this.hash = hash;
        this.remaining = remaining;
    }
}

// Every ABI that can surface a custom error from an on-chain revert. viem's
// `decodeErrorResult` walks each ABI's `error` fragments to match the 4-byte
// selector in the revert data.
const REVERTABLE_ABIS = [
    DeviceWallet,
    DeviceWalletFactory,
    ESIMWallet,
    ESIMWalletFactory,
    LazyWalletRegistry,
    P256Verifier,
    Registry,
    RegistryHelper,
] as const;

export interface DecodedRevert {
    errorName: string;
    args: readonly unknown[];
}

/**
 * Best-effort decode of raw revert data (the ABI-encoded `Error(string)`,
 * `Panic(uint256)`, or a contract custom error) against the known Kokio ABIs.
 * Returns `null` when the selector matches none of them.
 */
export const decodeContractRevert = (data: Hex): DecodedRevert | null => {
    if (!isHex(data) || data.length < 10) return null;

    for (const abi of REVERTABLE_ABIS) {
        try {
            const decoded = decodeErrorResult({ abi, data });
            return { errorName: decoded.errorName, args: (decoded.args ?? []) as readonly unknown[] };
        } catch {
            // Selector not present in this ABI - try the next one.
        }
    }
    return null;
};

/**
 * A decoded on-chain revert. Carries the raw revert data plus, when the
 * selector was recognised, the decoded custom-error name and args.
 */
export class ContractRevertError extends KokioError {
    readonly data: Hex;
    readonly decoded: DecodedRevert | null;

    constructor(data: Hex) {
        const decoded = decodeContractRevert(data);
        super(
            "CONTRACT_REVERT",
            decoded
                ? `Contract reverted with ${decoded.errorName}(${decoded.args.map(String).join(", ")})`
                : `Contract reverted with unrecognised data ${data}`,
        );
        this.data = data;
        this.decoded = decoded;
    }
}

/**
 * Pulls a ContractRevertError out of an error thrown by viem, or `null` if it
 * isn't a revert viem could decode a selector for.
 */
export const toContractRevertError = (err: unknown): ContractRevertError | null => {
    if (!(err instanceof BaseError)) return null;

    const revert = err.walk((e) => e instanceof ContractFunctionRevertedError);
    if (!(revert instanceof ContractFunctionRevertedError) || !revert.raw) return null;

    return new ContractRevertError(revert.raw);
};

/**
 * `client.writeContract`, but a recognised on-chain revert comes back as a
 * ContractRevertError instead of viem's raw error chain. Anything else -
 * network failures, an unrecognised revert selector - is rethrown as-is.
 */
export const writeContractOrThrow = async (
    client: Pick<WalletClient, "writeContract">,
    request: Parameters<WalletClient["writeContract"]>[0],
): ReturnType<WalletClient["writeContract"]> => {
    try {
        return await client.writeContract(request);
    } catch (err) {
        throw toContractRevertError(err) ?? err;
    }
};
