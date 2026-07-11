import { decodeErrorResult, Hex, isHex } from "viem";
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
 * `getCounterFactualAddress` view — a signal that the pinned BeaconProxy
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
            // Selector not present in this ABI — try the next one.
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
