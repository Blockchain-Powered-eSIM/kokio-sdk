import { describe, it, expect, vi } from "vitest";
import { encodeFunctionData, type Address, type Hex } from "viem";

import { makeMockWalletClient } from "../../utils/mockClient.js";
import { baseSepoliaFactoryAddresses } from "../../../src/logic/constants.js";
import { ProtocolAdmin, Registry } from "../../../src/abis/index.js";
import type { ScheduledBatchOperation, ScheduledOperation } from "../../../src/types.js";

import * as protocolAdmin from "../../../src/logic/admin/protocolAdmin.eoa.js";

// --- Fixtures ---------------------------------------------------------------
const EOA = "0x00000000000000000000000000000000000e0a01" as Address;
const VAULT = "0x000000000000000000000000000000000000ada1" as Address;
const NEW_ADMIN = "0x000000000000000000000000000000000000ad11" as Address;
const CANCELLER = "0x00000000000000000000000000000000000ca9c1" as Address;
const ZERO32 = "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex;
const SALT = "0x00000000000000000000000000000000000000000000000000000000000000aa" as Hex;
const OP_ID = "0x00000000000000000000000000000000000000000000000000000000000000d1" as Hex;
const ROLE = "0x0000000000000000000000000000000000000000000000000000000000000e01" as Hex;

const F = baseSepoliaFactoryAddresses;
const PA = F.PROTOCOL_ADMIN;
const CHAIN_ID = 84532;

const MIN_DELAY = 172_800n;

// The owner call used throughout: set the registry's vault.
const VAULT_CALL = {
    address: F.REGISTRY,
    abi: Registry,
    functionName: "updateVaultAddress",
    args: [VAULT],
} as const;

const VAULT_PAYLOAD = encodeFunctionData({
    abi: Registry,
    functionName: "updateVaultAddress",
    args: [VAULT],
});

// A client whose reads answer the two values `schedule` looks up.
const scheduleClient = () => makeMockWalletClient({
    chainId: CHAIN_ID,
    account: EOA,
    reads: { getMinDelay: MIN_DELAY, hashOperation: OP_ID, hashOperationBatch: OP_ID },
});

describe("protocolAdmin schedule", () => {
    it("encodes the owner call and schedules it at the contract's own min delay", async () => {
        const client = scheduleClient();

        const op = await protocolAdmin._schedule(client, VAULT_CALL);

        const write = client.writeContract as ReturnType<typeof vi.fn>;
        expect(write).toHaveBeenCalledTimes(1);
        const arg = write.mock.calls[0][0];
        expect(arg.address).toBe(PA);
        expect(arg.abi).toBe(ProtocolAdmin);
        expect(arg.functionName).toBe("schedule");
        // The payload targets the registry, the transaction targets the timelock.
        expect(arg.args).toEqual([F.REGISTRY, 0n, VAULT_PAYLOAD, ZERO32, ZERO32, MIN_DELAY]);
        expect(arg.account).toBe(EOA);

        // The returned object carries everything execute has to reproduce.
        expect(op).toEqual({
            hash: "0xwritehash",
            id: OP_ID,
            target: F.REGISTRY,
            value: 0n,
            payload: VAULT_PAYLOAD,
            predecessor: ZERO32,
            salt: ZERO32,
            delay: MIN_DELAY,
        });
    });

    it("uses an explicit salt, predecessor and delay when given", async () => {
        const client = scheduleClient();

        const op = await protocolAdmin._schedule(client, VAULT_CALL, { salt: SALT, predecessor: OP_ID }, 3600n);

        const arg = (client.writeContract as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(arg.args).toEqual([F.REGISTRY, 0n, VAULT_PAYLOAD, OP_ID, SALT, 3600n]);
        expect(op.salt).toBe(SALT);
        expect(op.predecessor).toBe(OP_ID);
        expect(op.delay).toBe(3600n);

        // An explicit delay means the min delay is never read.
        const reads = (client.readContract as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0].functionName);
        expect(reads).not.toContain("getMinDelay");
    });

    it("carries an owner call's value through to the scheduled payload", async () => {
        const client = scheduleClient();

        await protocolAdmin._schedule(client, { ...VAULT_CALL, value: 5n });

        const arg = (client.writeContract as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(arg.args[1]).toBe(5n);
    });

    it("batches several calls into one operation", async () => {
        const client = scheduleClient();

        const op = await protocolAdmin._scheduleBatch(client, [VAULT_CALL, { ...VAULT_CALL, value: 2n }]);

        const arg = (client.writeContract as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(arg.functionName).toBe("scheduleBatch");
        expect(arg.args).toEqual([
            [F.REGISTRY, F.REGISTRY],
            [0n, 2n],
            [VAULT_PAYLOAD, VAULT_PAYLOAD],
            ZERO32,
            ZERO32,
            MIN_DELAY,
        ]);
        expect(op.targets).toEqual([F.REGISTRY, F.REGISTRY]);
        expect(op.values).toEqual([0n, 2n]);
    });

    it("hashes a batch with hashOperationBatch, not hashOperation", async () => {
        const client = scheduleClient();

        await protocolAdmin._scheduleBatch(client, [VAULT_CALL]);

        const reads = (client.readContract as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0].functionName);
        expect(reads).toContain("hashOperationBatch");
        expect(reads).not.toContain("hashOperation");
    });
});

describe("protocolAdmin execute", () => {
    const OPERATION: ScheduledOperation = {
        hash: "0xwritehash",
        id: OP_ID,
        target: F.REGISTRY,
        value: 7n,
        payload: VAULT_PAYLOAD,
        predecessor: ZERO32,
        salt: SALT,
        delay: MIN_DELAY,
    };

    it("replays the scheduled fields and forwards the value", async () => {
        const client = makeMockWalletClient({ chainId: CHAIN_ID, account: EOA });

        await protocolAdmin._execute(client, OPERATION);

        const arg = (client.writeContract as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(arg.address).toBe(PA);
        expect(arg.functionName).toBe("execute");
        expect(arg.args).toEqual([F.REGISTRY, 7n, VAULT_PAYLOAD, ZERO32, SALT]);
        expect(arg.value).toBe(7n);
    });

    it("sends the sum of a batch's values", async () => {
        const client = makeMockWalletClient({ chainId: CHAIN_ID, account: EOA });
        const batch: ScheduledBatchOperation = {
            hash: "0xwritehash",
            id: OP_ID,
            targets: [F.REGISTRY, F.REGISTRY],
            values: [3n, 4n],
            payloads: [VAULT_PAYLOAD, VAULT_PAYLOAD],
            predecessor: ZERO32,
            salt: ZERO32,
            delay: MIN_DELAY,
        };

        await protocolAdmin._executeBatch(client, batch);

        const arg = (client.writeContract as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(arg.functionName).toBe("executeBatch");
        expect(arg.value).toBe(7n);
    });
});

// Everything that targets the timelock directly. Each row asserts the SDK writes
// to PROTOCOL_ADMIN with the expected function and args.
const directCases: Array<{
    label: string;
    run: (c: ReturnType<typeof makeMockWalletClient>) => Promise<unknown>;
    functionName: string;
    args: readonly unknown[];
}> = [
    {
        label: "_cancel",
        run: (c) => protocolAdmin._cancel(c, OP_ID),
        functionName: "cancel",
        args: [OP_ID],
    },
    {
        label: "_unpauseInstantly",
        run: (c) => protocolAdmin._unpauseInstantly(c, F.REGISTRY),
        functionName: "unpauseInstantly",
        args: [F.REGISTRY],
    },
    {
        label: "_revokeCancellersInstantly",
        run: (c) => protocolAdmin._revokeCancellersInstantly(c, [CANCELLER]),
        functionName: "revokeCancellersInstantly",
        args: [[CANCELLER]],
    },
    {
        label: "_disableAdminInstantly",
        run: (c) => protocolAdmin._disableAdminInstantly(c, F.REGISTRY),
        functionName: "disableAdminInstantly",
        args: [F.REGISTRY],
    },
    {
        // The registry is the only contract holding the admin address, so a
        // guardian acting during an incident should not have to supply it.
        label: "_disableAdminInstantly (no target)",
        run: (c) => protocolAdmin._disableAdminInstantly(c),
        functionName: "disableAdminInstantly",
        args: [F.REGISTRY],
    },
    {
        label: "_acceptOwnershipBatch",
        run: (c) => protocolAdmin._acceptOwnershipBatch(c, [F.REGISTRY, F.DEVICE_WALLET_FACTORY]),
        functionName: "acceptOwnershipBatch",
        args: [[F.REGISTRY, F.DEVICE_WALLET_FACTORY]],
    },
    {
        label: "_renounceRole",
        run: (c) => protocolAdmin._renounceRole(c, ROLE, EOA),
        functionName: "renounceRole",
        args: [ROLE, EOA],
    },
    {
        label: "_scheduleRaw",
        run: (c) => protocolAdmin._scheduleRaw(c, F.REGISTRY, 1n, "0xdead", ZERO32, SALT, 60n),
        functionName: "schedule",
        args: [F.REGISTRY, 1n, "0xdead", ZERO32, SALT, 60n],
    },
    {
        label: "_executeRaw",
        run: (c) => protocolAdmin._executeRaw(c, F.REGISTRY, 1n, "0xdead", ZERO32, SALT),
        functionName: "execute",
        args: [F.REGISTRY, 1n, "0xdead", ZERO32, SALT],
    },
];

describe("protocolAdmin direct writes", () => {
    it.each(directCases)("$label writes the expected calldata to the timelock", async ({ run, functionName, args }) => {
        const client = makeMockWalletClient({ chainId: CHAIN_ID, account: EOA });
        await run(client);

        const write = client.writeContract as ReturnType<typeof vi.fn>;
        expect(write).toHaveBeenCalledTimes(1);
        const arg = write.mock.calls[0][0];
        expect(arg.address).toBe(PA);
        expect(arg.abi).toBe(ProtocolAdmin);
        expect(arg.functionName).toBe(functionName);
        expect(arg.args).toEqual(args);
        expect(arg.account).toBe(EOA);
    });

    it.each(directCases)("$label throws MISSING_EOA_WALLET without an account", async ({ run }) => {
        const client = makeMockWalletClient({ chainId: CHAIN_ID });
        await expect(run(client)).rejects.toThrow(/EOA/i);
    });

    it("schedule and scheduleBatch also need an account", async () => {
        const client = makeMockWalletClient({ chainId: CHAIN_ID, reads: { getMinDelay: MIN_DELAY } });
        await expect(protocolAdmin._schedule(client, VAULT_CALL)).rejects.toThrow(/EOA/i);
        await expect(protocolAdmin._scheduleBatch(client, [VAULT_CALL])).rejects.toThrow(/EOA/i);
    });
});

// The self-call-only functions. These are unreachable from an EOA, so the SDK
// returns the call to schedule rather than sending one.
describe("protocolAdmin self-call payloads", () => {
    const cases: Array<{ label: string; run: () => Promise<{ functionName: string; args?: readonly unknown[]; address: Address }>; functionName: string; args: readonly unknown[] }> = [
        {
            label: "grantRole",
            run: () => protocolAdmin._grantRoleCall(makeMockWalletClient({ chainId: CHAIN_ID, account: EOA }), ROLE, EOA),
            functionName: "grantRole",
            args: [ROLE, EOA],
        },
        {
            label: "revokeRole",
            run: () => protocolAdmin._revokeRoleCall(makeMockWalletClient({ chainId: CHAIN_ID, account: EOA }), ROLE, EOA),
            functionName: "revokeRole",
            args: [ROLE, EOA],
        },
        {
            label: "updateDelay",
            run: () => protocolAdmin._updateDelayCall(makeMockWalletClient({ chainId: CHAIN_ID, account: EOA }), 7200n),
            functionName: "updateDelay",
            args: [7200n],
        },
        {
            label: "disableAndNominate",
            run: () => protocolAdmin._disableAndNominateCall(makeMockWalletClient({ chainId: CHAIN_ID, account: EOA }), F.REGISTRY, NEW_ADMIN),
            functionName: "disableAndNominate",
            args: [F.REGISTRY, NEW_ADMIN],
        },
    ];

    it.each(cases)("$label builds a call aimed at the timelock itself", async ({ run, functionName, args }) => {
        const call = await run();
        expect(call.address).toBe(PA);
        expect(call.functionName).toBe(functionName);
        expect(call.args).toEqual(args);
    });

    it("a built payload schedules like any other owner call", async () => {
        const client = scheduleClient();

        const call = await protocolAdmin._updateDelayCall(client, 7200n);
        await protocolAdmin._schedule(client, call);

        const arg = (client.writeContract as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(arg.args[0]).toBe(PA);
        expect(arg.args[2]).toBe(
            encodeFunctionData({ abi: ProtocolAdmin, functionName: "updateDelay", args: [7200n] })
        );
    });
});

// The payloads aimed at the registry rather than the timelock. Unlike the
// self-call group the address is the thing worth pinning.
describe("protocolAdmin registry payloads", () => {
    const OTHER = "0x0000000000000000000000000000000000007a61" as Address;
    const client = () => makeMockWalletClient({ chainId: CHAIN_ID, account: EOA });

    const cases = [
        { label: "disableAdminCall", run: protocolAdmin._disableAdminCall, functionName: "disableAdmin" },
        { label: "enableAdminCall", run: protocolAdmin._enableAdminCall, functionName: "enableAdmin" },
        { label: "unpauseCall", run: protocolAdmin._unpauseCall, functionName: "unpause" },
    ] as const;

    it.each(cases)("$label defaults to the registry, not the timelock", async ({ run, functionName }) => {
        const call = await run(client());

        expect(call.address).toBe(F.REGISTRY);
        expect(call.address).not.toBe(PA);
        expect(call.functionName).toBe(functionName);
        expect(call.args).toEqual([]);
    });

    it.each(cases)("$label aims at an explicit target when given one", async ({ run }) => {
        const call = await run(client(), OTHER);
        expect(call.address).toBe(OTHER);
    });

    it("enableAdminCall schedules against the registry", async () => {
        const c = scheduleClient();

        await protocolAdmin._schedule(c, await protocolAdmin._enableAdminCall(c));

        const arg = (c.writeContract as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(arg.args[0]).toBe(F.REGISTRY);
        expect(arg.args[2]).toBe(encodeFunctionData({ abi: Registry, functionName: "enableAdmin", args: [] }));
        // Waits like anything else: the delay is the min delay, not zero.
        expect(arg.args[5]).toBe(MIN_DELAY);
    });

    it("setDefaultDataBundlePriceCapCall carries the cap and defaults to the registry", async () => {
        const call = await protocolAdmin._setDefaultDataBundlePriceCapCall(client(), 5n * 10n ** 18n);

        expect(call.address).toBe(F.REGISTRY);
        expect(call.functionName).toBe("setDefaultDataBundlePriceCap");
        expect(call.args).toEqual([5n * 10n ** 18n]);
    });

    it("setDefaultDataBundlePriceCapCall aims at an explicit target when given one", async () => {
        const call = await protocolAdmin._setDefaultDataBundlePriceCapCall(client(), 1n, OTHER);
        expect(call.address).toBe(OTHER);
    });
});
