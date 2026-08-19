import { describe, it, expect, vi } from "vitest";
import {
    ContractFunctionRevertedError,
    encodeAbiParameters,
    encodeErrorResult,
    encodeEventTopics,
    type Address,
} from "viem";

import { makeMockWalletClient } from "../../utils/mockClient.js";
import { baseSepoliaFactoryAddresses } from "../../../src/logic/constants.js";
import { LazyWalletRegistry } from "../../../src/abis/index.js";
import {
    DEFAULT_ESIM_WALLETS_PER_CALL,
    DEFAULT_HISTORY_ENTRIES_PER_CALL,
    _deployLazyWalletAllBatches,
    _setHistoryForLazyWalletAllBatches,
} from "../../../src/logic/admin/lazyWalletRegistry.eoa.js";

const F = baseSepoliaFactoryAddresses;
const CHAIN_ID = 84532;

const EOA = "0x00000000000000000000000000000000000e0a01" as Address;
// Checksummed, since this one comes back through an event decode rather than
// straight from a mocked read.
const DEVICE_WALLET = "0x00000000000000000000000000000000000DEaD1" as Address;
const ESIM_WALLET = "0x00000000000000000000000000000000000e51a1" as Address;
const ZERO = "0x0000000000000000000000000000000000000000" as Address;

const DEVICE = "Device_11";
const OWNER_KEY: [`0x${string}`, `0x${string}`] = [
    "0x6B17D1F2E12C4247F8BCE6E563A440F277037D812DEB33A0F4A13945D898C291",
    "0x4FE342E2FE1A7F9B8EE7EB4A7C0F9E162BCE33576B315ECECBB6406837BF51F1",
];

// A wallet address per index, so a batch's wallets are distinguishable.
const walletAt = (i: number) => `0x${(i + 1).toString(16).padStart(40, "0")}` as Address;

// Real logs, encoded the way the chain would, so `parseEventLogs` does the same
// decoding here that it does against a live receipt.
const deployedLog = (eSIMWallets: readonly Address[], eSIMIdentifiers: readonly string[], remaining: bigint) => ({
    address: F.LAZY_WALLET_REGISTRY,
    topics: encodeEventTopics({
        abi: LazyWalletRegistry,
        eventName: "LazyESIMWalletsDeployed",
        args: { _deviceWallet: DEVICE_WALLET },
    }),
    data: encodeAbiParameters(
        [{ type: "string" }, { type: "address[]" }, { type: "string[]" }, { type: "uint256" }],
        [DEVICE, [...eSIMWallets], [...eSIMIdentifiers], remaining],
    ),
});

const historyLog = (copied: bigint, remaining: bigint) => ({
    address: F.LAZY_WALLET_REGISTRY,
    topics: encodeEventTopics({
        abi: LazyWalletRegistry,
        eventName: "LazyHistoryCopied",
        args: { _eSIMWallet: ESIM_WALLET },
    }),
    data: encodeAbiParameters(
        [{ type: "string" }, { type: "uint256" }, { type: "uint256" }],
        ["eid-1", copied, remaining],
    ),
});

// The terminal conditions are reverts, so the simulation the SDK runs to tell
// "finished" from "more to do" has to fail the way the chain fails it.
const revertsWith = (errorName: "AllESIMWalletsDeployed" | "HistoryAlreadyCopied", arg: string) => () => {
    throw new ContractFunctionRevertedError({
        abi: LazyWalletRegistry,
        data: encodeErrorResult({ abi: LazyWalletRegistry, errorName, args: [arg] }),
        functionName: "simulated",
    });
};

const writesOf = (client: ReturnType<typeof makeMockWalletClient>) =>
    (client.writeContract as ReturnType<typeof vi.fn>).mock.calls.map((call) => call[0]);

describe("_deployLazyWalletAllBatches", () => {

    it("sends one transaction when the device fits in a single batch", async () => {
        const client = makeMockWalletClient({
            chainId: CHAIN_ID,
            account: EOA,
            reads: { eSIMWalletsDeployed: 0n },
            receipts: [{ logs: [deployedLog([walletAt(0), walletAt(1)], ["eid-0", "eid-1"], 0n)] }],
        });

        const result = await _deployLazyWalletAllBatches(client, OWNER_KEY, DEVICE, 1n, 2n);

        const writes = writesOf(client);
        expect(writes).toHaveLength(1);
        expect(writes[0].functionName).toBe("deployLazyWalletAndSetESIMIdentifier");
        expect(writes[0].args).toEqual([OWNER_KEY, DEVICE, 1n, 2n, DEFAULT_ESIM_WALLETS_PER_CALL]);
        expect(writes[0].value).toBe(2n);

        expect(result.deviceWallet).toBe(DEVICE_WALLET);
        expect(result.eSIMWallets).toEqual([walletAt(0), walletAt(1)]);
        expect(result.eSIMIdentifiers).toEqual(["eid-0", "eid-1"]);
        expect(result.alreadyComplete).toBe(false);
        expect(result.batches).toHaveLength(1);
    });

    it("keeps going until the device reports nothing remaining", async () => {
        const client = makeMockWalletClient({
            chainId: CHAIN_ID,
            account: EOA,
            reads: { eSIMWalletsDeployed: 0n },
            receipts: [
                { logs: [deployedLog([walletAt(0)], ["eid-0"], 2n)] },
                { logs: [deployedLog([walletAt(1)], ["eid-1"], 1n)] },
                { logs: [deployedLog([walletAt(2)], ["eid-2"], 0n)] },
            ],
        });

        const result = await _deployLazyWalletAllBatches(client, OWNER_KEY, DEVICE, 1n, 0n, 1n);

        const writes = writesOf(client);
        expect(writes).toHaveLength(3);
        expect(writes[0].functionName).toBe("deployLazyWalletAndSetESIMIdentifier");
        // Continuations carry no deposit: only the first batch is payable.
        expect(writes[1].functionName).toBe("deployMoreESIMWalletsForLazyDevice");
        expect(writes[1].args).toEqual([DEVICE, 1n]);
        expect(writes[1].value).toBeUndefined();
        expect(writes[2].functionName).toBe("deployMoreESIMWalletsForLazyDevice");

        // The batches are flattened in the order they were deployed.
        expect(result.eSIMWallets).toEqual([walletAt(0), walletAt(1), walletAt(2)]);
        expect(result.eSIMIdentifiers).toEqual(["eid-0", "eid-1", "eid-2"]);
        expect(result.batches.map((b) => b.remaining)).toEqual([2n, 1n, 0n]);
    });

    it("resumes a part-deployed device instead of restarting it", async () => {
        const client = makeMockWalletClient({
            chainId: CHAIN_ID,
            account: EOA,
            reads: {
                eSIMWalletsDeployed: 3n,
                uniqueIdentifierToDeviceWallet: DEVICE_WALLET,
            },
            receipts: [{ logs: [deployedLog([walletAt(3)], ["eid-3"], 0n)] }],
        });

        const result = await _deployLazyWalletAllBatches(client, OWNER_KEY, DEVICE, 1n, 0n);

        const writes = writesOf(client);
        expect(writes).toHaveLength(1);
        expect(writes[0].functionName).toBe("deployMoreESIMWalletsForLazyDevice");
        expect(result.deviceWallet).toBe(DEVICE_WALLET);
        expect(result.eSIMWallets).toEqual([walletAt(3)]);
        expect(result.alreadyComplete).toBe(false);
    });

    it("sends nothing for a device that is already fully deployed", async () => {
        const client = makeMockWalletClient({
            chainId: CHAIN_ID,
            account: EOA,
            reads: {
                eSIMWalletsDeployed: 5n,
                uniqueIdentifierToDeviceWallet: DEVICE_WALLET,
            },
            simulate: revertsWith("AllESIMWalletsDeployed", DEVICE),
        });

        const result = await _deployLazyWalletAllBatches(client, OWNER_KEY, DEVICE, 1n, 0n);

        expect(writesOf(client)).toHaveLength(0);
        expect(result.alreadyComplete).toBe(true);
        expect(result.deviceWallet).toBe(DEVICE_WALLET);
        expect(result.batches).toEqual([]);
    });

    it("refuses a deposit on a resume, since the first batch already took one", async () => {
        const client = makeMockWalletClient({
            chainId: CHAIN_ID,
            account: EOA,
            reads: { eSIMWalletsDeployed: 3n },
        });

        await expect(_deployLazyWalletAllBatches(client, OWNER_KEY, DEVICE, 1n, 5n))
            .rejects.toThrow(/deposit of 0/i);
        expect(writesOf(client)).toHaveLength(0);
    });

    it.each([0n, 21n])("refuses a batch size of %s before sending anything", async (maxWallets) => {
        const client = makeMockWalletClient({
            chainId: CHAIN_ID,
            account: EOA,
            reads: { eSIMWalletsDeployed: 0n },
        });

        await expect(_deployLazyWalletAllBatches(client, OWNER_KEY, DEVICE, 1n, 0n, maxWallets))
            .rejects.toThrow(/between 1 and 20/);
        expect(writesOf(client)).toHaveLength(0);
    });

    it("throws when a batch lands without the event the loop reads", async () => {
        const client = makeMockWalletClient({
            chainId: CHAIN_ID,
            account: EOA,
            reads: { eSIMWalletsDeployed: 0n },
            receipts: [{ logs: [] }],
        });

        await expect(_deployLazyWalletAllBatches(client, OWNER_KEY, DEVICE, 1n, 0n))
            .rejects.toThrow(/LazyESIMWalletsDeployed/);
    });

    it("stops rather than spinning when a batch deploys nothing", async () => {
        const client = makeMockWalletClient({
            chainId: CHAIN_ID,
            account: EOA,
            reads: { eSIMWalletsDeployed: 0n },
            receipts: [
                { logs: [deployedLog([walletAt(0)], ["eid-0"], 2n)] },
                { logs: [deployedLog([], [], 2n)] },
            ],
        });

        await expect(_deployLazyWalletAllBatches(client, OWNER_KEY, DEVICE, 1n, 0n))
            .rejects.toThrow(/no progress/i);
    });

    it("throws MISSING_EOA_WALLET without an account", async () => {
        const client = makeMockWalletClient({ chainId: CHAIN_ID, });
        await expect(_deployLazyWalletAllBatches(client, OWNER_KEY, DEVICE, 1n, 0n)).rejects.toThrow(/EOA/i);
    });
});

describe("_setHistoryForLazyWalletAllBatches", () => {

    it("copies the whole history over as many batches as it takes", async () => {
        const client = makeMockWalletClient({
            chainId: CHAIN_ID,
            account: EOA,
            reads: { lazyDeployedESIMWallet: ESIM_WALLET },
            receipts: [
                { logs: [historyLog(25n, 30n)] },
                { logs: [historyLog(25n, 5n)] },
                { logs: [historyLog(5n, 0n)] },
            ],
        });

        const result = await _setHistoryForLazyWalletAllBatches(client, "eid-1");

        const writes = writesOf(client);
        expect(writes).toHaveLength(3);
        expect(writes[0].functionName).toBe("setHistoryForLazyWallet");
        expect(writes[0].args).toEqual(["eid-1", DEFAULT_HISTORY_ENTRIES_PER_CALL]);

        expect(result.eSIMWallet).toBe(ESIM_WALLET);
        expect(result.copied).toBe(55n);
        expect(result.batches.map((b) => b.copied)).toEqual([25n, 25n, 5n]);
        expect(result.alreadyComplete).toBe(false);
    });

    it("sends nothing when the history is already copied", async () => {
        const client = makeMockWalletClient({
            chainId: CHAIN_ID,
            account: EOA,
            reads: { lazyDeployedESIMWallet: ESIM_WALLET },
            simulate: revertsWith("HistoryAlreadyCopied", "eid-1"),
        });

        const result = await _setHistoryForLazyWalletAllBatches(client, "eid-1");

        expect(writesOf(client)).toHaveLength(0);
        expect(result.alreadyComplete).toBe(true);
        expect(result.copied).toBe(0n);
    });

    it("refuses an eSIM this registry never deployed a wallet for", async () => {
        const client = makeMockWalletClient({
            chainId: CHAIN_ID,
            account: EOA,
            reads: { lazyDeployedESIMWallet: ZERO },
        });

        await expect(_setHistoryForLazyWalletAllBatches(client, "eid-1"))
            .rejects.toThrow(/No lazily deployed eSIM wallet/);
        expect(writesOf(client)).toHaveLength(0);
    });

    it.each([0n, 51n])("refuses a batch size of %s before sending anything", async (maxEntries) => {
        const client = makeMockWalletClient({
            chainId: CHAIN_ID,
            account: EOA,
            reads: { lazyDeployedESIMWallet: ESIM_WALLET },
        });

        await expect(_setHistoryForLazyWalletAllBatches(client, "eid-1", maxEntries))
            .rejects.toThrow(/between 1 and 50/);
        expect(writesOf(client)).toHaveLength(0);
    });
});
