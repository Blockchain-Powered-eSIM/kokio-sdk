import { describe, it, expect } from "vitest";
import { encodeErrorResult, toHex } from "viem";
import {
    KokioError,
    NullOrUndefinedValueError,
    MissingSmartWalletError,
    MissingEOAWalletError,
    InvalidClientError,
    UnsupportedChainError,
    UnconfiguredChainError,
    CounterfactualMismatchError,
    ContractRevertError,
    decodeContractRevert,
} from "./errors.js";
import { DeviceWalletFactory } from "../abis/index.js";

describe("typed errors", () => {
    it("every typed error is a KokioError with a stable code and its own name", () => {
        const cases: Array<[KokioError, string, string]> = [
            [new NullOrUndefinedValueError(), "NULL_OR_UNDEFINED_VALUE", "NullOrUndefinedValueError"],
            [new MissingSmartWalletError(), "MISSING_SMART_WALLET", "MissingSmartWalletError"],
            [new MissingEOAWalletError(), "MISSING_EOA_WALLET", "MissingEOAWalletError"],
            [new InvalidClientError(), "INVALID_CLIENT", "InvalidClientError"],
            [new UnsupportedChainError(999), "UNSUPPORTED_CHAIN", "UnsupportedChainError"],
            [new UnconfiguredChainError(1), "UNCONFIGURED_CHAIN", "UnconfiguredChainError"],
        ];
        for (const [err, code, name] of cases) {
            expect(err).toBeInstanceOf(KokioError);
            expect(err).toBeInstanceOf(Error);
            expect(err.code).toBe(code);
            expect(err.name).toBe(name);
        }
    });

    it("keeps messages matching the assertions the rest of the suite relies on", () => {
        expect(new MissingSmartWalletError().message).toMatch(/smart wallet/i);
        expect(new MissingEOAWalletError().message).toMatch(/EOA/i);
        expect(new UnsupportedChainError(999999).message).toMatch(/Unsupported chain id 999999/);
        expect(new UnconfiguredChainError(1).message).toMatch(/not yet configured/);
    });

    it("CounterfactualMismatchError carries both addresses and a descriptive message", () => {
        const off = "0x1111111111111111111111111111111111111111" as const;
        const on = "0x2222222222222222222222222222222222222222" as const;
        const err = new CounterfactualMismatchError(off, on);
        expect(err.offChain).toBe(off);
        expect(err.onChain).toBe(on);
        expect(err.message).toMatch(/Counterfactual address mismatch/);
    });
});

describe("decodeContractRevert", () => {
    it("decodes a custom error (with args) defined on a known ABI", () => {
        const implementation = "0x00000000000000000000000000000000000000ab" as const;
        const data = encodeErrorResult({
            abi: DeviceWalletFactory,
            errorName: "ERC1967InvalidImplementation",
            args: [implementation],
        });

        const decoded = decodeContractRevert(data);
        expect(decoded).not.toBeNull();
        expect(decoded?.errorName).toBe("ERC1967InvalidImplementation");
        // viem returns the address checksummed; compare case-insensitively.
        expect((decoded?.args[0] as string).toLowerCase()).toBe(implementation);
    });

    it("decodes a parameterless custom error", () => {
        const data = encodeErrorResult({ abi: DeviceWalletFactory, errorName: "FailedInnerCall" });
        expect(decodeContractRevert(data)?.errorName).toBe("FailedInnerCall");
    });

    it("returns null for an unrecognised selector", () => {
        expect(decodeContractRevert("0xdeadbeef")).toBeNull();
    });

    it("returns null for non-hex or too-short data", () => {
        expect(decodeContractRevert(toHex("x"))).toBeNull();
        expect(decodeContractRevert("0x")).toBeNull();
    });
});

describe("ContractRevertError", () => {
    it("decodes recognised revert data into a readable message", () => {
        const data = encodeErrorResult({ abi: DeviceWalletFactory, errorName: "FailedInnerCall" });
        const err = new ContractRevertError(data);
        expect(err).toBeInstanceOf(KokioError);
        expect(err.code).toBe("CONTRACT_REVERT");
        expect(err.data).toBe(data);
        expect(err.decoded?.errorName).toBe("FailedInnerCall");
        expect(err.message).toMatch(/FailedInnerCall/);
    });

    it("falls back to raw data when the selector is unrecognised", () => {
        const err = new ContractRevertError("0xdeadbeef");
        expect(err.decoded).toBeNull();
        expect(err.message).toMatch(/unrecognised data 0xdeadbeef/);
    });
});
