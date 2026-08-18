import { Address, Hex, WalletClient, encodeFunctionData, publicActions } from "viem";
import { _getChainSpecificConstants } from "../constants.js";
import { MissingEOAWalletError } from "../errors.js";
import { ProtocolAdmin } from "../../abis/index.js";
import type {
    OperationOptions,
    OwnerCall,
    ScheduledBatchOperation,
    ScheduledOperation,
} from "../../types.js";

// Admin-EOA logic for `ProtocolAdmin`, the timelock that owns `Registry`,
// `LazyWalletRegistry`, `DeviceWalletFactory` and `ESIMWalletFactory`.
//
// Anything `onlyOwner` on those four contracts goes one way: a proposer schedules
// it, the delay elapses, and anyone executes it. Only `schedule` and `cancel` need
// a privileged EOA. Execution is open, so the `client` for `_execute` can be any
// funded account.
//
// The guardian calls and `_acceptOwnershipBatch` are the exceptions: they land
// straight away with no delay.

const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex;

const _resolve = async (client: WalletClient) => {
    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    return _getChainSpecificConstants(chainID, rpcURL);
}

// Turns an `OwnerCall` into the (target, value, payload) triple the timelock stores.
const _encode = (call: OwnerCall): { target: Address; value: bigint; payload: Hex } => ({
    target: call.address,
    value: call.value ?? 0n,
    payload: encodeFunctionData({
        abi: call.abi,
        functionName: call.functionName,
        args: call.args as readonly unknown[] | undefined,
    }),
});

// ---------------------------------------------------------------------------
// Operation ids
// ---------------------------------------------------------------------------

/**
 * The id the timelock will file this call under. Computed on chain so the SDK
 * and the contract cannot disagree about it.
 */
export const _operationId = async (client: WalletClient, call: OwnerCall, opts: OperationOptions = {}): Promise<Hex> => {

    const values = await _resolve(client);
    const { target, value, payload } = _encode(call);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.PROTOCOL_ADMIN,
        abi: ProtocolAdmin,
        functionName: "hashOperation",
        args: [target, value, payload, opts.predecessor ?? ZERO_BYTES32, opts.salt ?? ZERO_BYTES32]
    }) as Promise<Hex>;
}

/** The id for a batch. Hashes differently from the same calls scheduled one by one. */
export const _operationIdBatch = async (client: WalletClient, calls: readonly OwnerCall[], opts: OperationOptions = {}): Promise<Hex> => {

    const values = await _resolve(client);
    const encoded = calls.map(_encode);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.PROTOCOL_ADMIN,
        abi: ProtocolAdmin,
        functionName: "hashOperationBatch",
        args: [
            encoded.map((e) => e.target),
            encoded.map((e) => e.value),
            encoded.map((e) => e.payload),
            opts.predecessor ?? ZERO_BYTES32,
            opts.salt ?? ZERO_BYTES32
        ]
    }) as Promise<Hex>;
}

// ---------------------------------------------------------------------------
// Scheduling - PROPOSER_ROLE
// ---------------------------------------------------------------------------

/**
 * Announce an owner call. `PROPOSER_ROLE`.
 *
 * `delay` defaults to `getMinDelay()`. Keep the returned object: `execute` rebuilds
 * the id from it, and without it the arguments have to be recovered from the
 * `CallScheduled` event.
 */
export const _schedule = async (
    client: WalletClient,
    call: OwnerCall,
    opts: OperationOptions = {},
    delay?: bigint
): Promise<ScheduledOperation> => {

    const values = await _resolve(client);

    if (!client.account) throw new MissingEOAWalletError();

    const { target, value, payload } = _encode(call);
    const predecessor = opts.predecessor ?? ZERO_BYTES32;
    const salt = opts.salt ?? ZERO_BYTES32;
    const publicClient = client.extend(publicActions);

    const resolvedDelay = delay ?? await publicClient.readContract({
        address: values.factoryAddresses.PROTOCOL_ADMIN,
        abi: ProtocolAdmin,
        functionName: "getMinDelay",
        args: []
    }) as bigint;

    const id = await publicClient.readContract({
        address: values.factoryAddresses.PROTOCOL_ADMIN,
        abi: ProtocolAdmin,
        functionName: "hashOperation",
        args: [target, value, payload, predecessor, salt]
    }) as Hex;

    const hash = await client.writeContract({
        address: values.factoryAddresses.PROTOCOL_ADMIN,
        chain: values.chain,
        account: client.account.address,
        abi: ProtocolAdmin,
        functionName: 'schedule',
        args: [target, value, payload, predecessor, salt, resolvedDelay]
    });

    return { hash, id, target, value, payload, predecessor, salt, delay: resolvedDelay };
}

/**
 * Announce several owner calls as one operation. `PROPOSER_ROLE`.
 *
 * Use this where the calls only make sense together, such as evicting a guardian,
 * which needs both its guardian and its executor role revoked before it can act
 * again.
 */
export const _scheduleBatch = async (
    client: WalletClient,
    calls: readonly OwnerCall[],
    opts: OperationOptions = {},
    delay?: bigint
): Promise<ScheduledBatchOperation> => {

    const values = await _resolve(client);

    if (!client.account) throw new MissingEOAWalletError();

    const encoded = calls.map(_encode);
    const targets = encoded.map((e) => e.target);
    const callValues = encoded.map((e) => e.value);
    const payloads = encoded.map((e) => e.payload);
    const predecessor = opts.predecessor ?? ZERO_BYTES32;
    const salt = opts.salt ?? ZERO_BYTES32;
    const publicClient = client.extend(publicActions);

    const resolvedDelay = delay ?? await publicClient.readContract({
        address: values.factoryAddresses.PROTOCOL_ADMIN,
        abi: ProtocolAdmin,
        functionName: "getMinDelay",
        args: []
    }) as bigint;

    const id = await publicClient.readContract({
        address: values.factoryAddresses.PROTOCOL_ADMIN,
        abi: ProtocolAdmin,
        functionName: "hashOperationBatch",
        args: [targets, callValues, payloads, predecessor, salt]
    }) as Hex;

    const hash = await client.writeContract({
        address: values.factoryAddresses.PROTOCOL_ADMIN,
        chain: values.chain,
        account: client.account.address,
        abi: ProtocolAdmin,
        functionName: 'scheduleBatch',
        args: [targets, callValues, payloads, predecessor, salt, resolvedDelay]
    });

    return { hash, id, targets, values: callValues, payloads, predecessor, salt, delay: resolvedDelay };
}

/**
 * Schedule a payload built elsewhere. `PROPOSER_ROLE`. For calldata that did not
 * come from an ABI in this SDK.
 */
export const _scheduleRaw = async (
    client: WalletClient,
    target: Address,
    value: bigint,
    payload: Hex,
    predecessor: Hex,
    salt: Hex,
    delay: bigint
) => {

    const values = await _resolve(client);

    if (!client.account) throw new MissingEOAWalletError();

    return client.writeContract({
        address: values.factoryAddresses.PROTOCOL_ADMIN,
        chain: values.chain,
        account: client.account.address,
        abi: ProtocolAdmin,
        functionName: 'schedule',
        args: [target, value, payload, predecessor, salt, delay]
    });
}

// ---------------------------------------------------------------------------
// Execution - open to anyone
// ---------------------------------------------------------------------------

/**
 * Run a scheduled operation once its delay has elapsed. Permissionless, so any
 * funded EOA works.
 *
 * Pass back the object `schedule` returned. The timelock recomputes the id from
 * these fields, so an altered value looks up an operation that was never
 * scheduled and reverts.
 */
export const _execute = async (client: WalletClient, operation: ScheduledOperation) => {

    const values = await _resolve(client);

    if (!client.account) throw new MissingEOAWalletError();

    return client.writeContract({
        address: values.factoryAddresses.PROTOCOL_ADMIN,
        chain: values.chain,
        account: client.account.address,
        abi: ProtocolAdmin,
        functionName: 'execute',
        args: [operation.target, operation.value, operation.payload, operation.predecessor, operation.salt],
        value: operation.value
    });
}

/** Run a scheduled batch. Permissionless, same rules as `_execute`. */
export const _executeBatch = async (client: WalletClient, operation: ScheduledBatchOperation) => {

    const values = await _resolve(client);

    if (!client.account) throw new MissingEOAWalletError();

    return client.writeContract({
        address: values.factoryAddresses.PROTOCOL_ADMIN,
        chain: values.chain,
        account: client.account.address,
        abi: ProtocolAdmin,
        functionName: 'executeBatch',
        args: [operation.targets, operation.values, operation.payloads, operation.predecessor, operation.salt],
        value: operation.values.reduce((sum, v) => sum + v, 0n)
    });
}

/** Execute a payload scheduled through `_scheduleRaw`. Permissionless. */
export const _executeRaw = async (
    client: WalletClient,
    target: Address,
    value: bigint,
    payload: Hex,
    predecessor: Hex,
    salt: Hex
) => {

    const values = await _resolve(client);

    if (!client.account) throw new MissingEOAWalletError();

    return client.writeContract({
        address: values.factoryAddresses.PROTOCOL_ADMIN,
        chain: values.chain,
        account: client.account.address,
        abi: ProtocolAdmin,
        functionName: 'execute',
        args: [target, value, payload, predecessor, salt],
        value
    });
}

// ---------------------------------------------------------------------------
// Cancelling - CANCELLER_ROLE
// ---------------------------------------------------------------------------

/**
 * Drop a scheduled operation before it runs. `CANCELLER_ROLE`, which every
 * proposer also holds.
 */
export const _cancel = async (client: WalletClient, id: Hex) => {

    const values = await _resolve(client);

    if (!client.account) throw new MissingEOAWalletError();

    return client.writeContract({
        address: values.factoryAddresses.PROTOCOL_ADMIN,
        chain: values.chain,
        account: client.account.address,
        abi: ProtocolAdmin,
        functionName: 'cancel',
        args: [id]
    });
}

// ---------------------------------------------------------------------------
// Guardian powers - GUARDIAN_ROLE, no delay
// ---------------------------------------------------------------------------

/**
 * Release a pause on a protocol contract straight away. `GUARDIAN_ROLE`.
 *
 * The selector is fixed in the contract, so this cannot be pointed at anything
 * else on the target.
 */
export const _unpauseInstantly = async (client: WalletClient, target: Address) => {

    const values = await _resolve(client);

    if (!client.account) throw new MissingEOAWalletError();

    return client.writeContract({
        address: values.factoryAddresses.PROTOCOL_ADMIN,
        chain: values.chain,
        account: client.account.address,
        abi: ProtocolAdmin,
        functionName: 'unpauseInstantly',
        args: [target]
    });
}

/**
 * Strip the cancel power from accounts straight away. `GUARDIAN_ROLE`.
 *
 * All or nothing: an account that does not hold the role reverts the whole batch
 * rather than being skipped, so a guardian acting on a list is never left
 * believing a veto is gone while it is still there.
 */
export const _revokeCancellersInstantly = async (client: WalletClient, accounts: readonly Address[]) => {

    const values = await _resolve(client);

    if (!client.account) throw new MissingEOAWalletError();

    return client.writeContract({
        address: values.factoryAddresses.PROTOCOL_ADMIN,
        chain: values.chain,
        account: client.account.address,
        abi: ProtocolAdmin,
        functionName: 'revokeCancellersInstantly',
        args: [accounts]
    });
}

/**
 * Suspend a protocol contract's admin key straight away. `GUARDIAN_ROLE`.
 *
 * Takes the power away and hands none out. Reinstating the key or naming a
 * replacement is an owner action and waits out the delay.
 */
export const _disableAdminInstantly = async (client: WalletClient, target: Address) => {

    const values = await _resolve(client);

    if (!client.account) throw new MissingEOAWalletError();

    return client.writeContract({
        address: values.factoryAddresses.PROTOCOL_ADMIN,
        chain: values.chain,
        account: client.account.address,
        abi: ProtocolAdmin,
        functionName: 'disableAdminInstantly',
        args: [target]
    });
}

// ---------------------------------------------------------------------------
// Ownership handover and role exit - permissionless / self
// ---------------------------------------------------------------------------

/**
 * Finish taking ownership of contracts that have already offered it.
 * Permissionless, and reverts `OwnershipNotOffered` for any target whose
 * `pendingOwner` is not the timelock.
 */
export const _acceptOwnershipBatch = async (client: WalletClient, targets: readonly Address[]) => {

    const values = await _resolve(client);

    if (!client.account) throw new MissingEOAWalletError();

    return client.writeContract({
        address: values.factoryAddresses.PROTOCOL_ADMIN,
        chain: values.chain,
        account: client.account.address,
        abi: ProtocolAdmin,
        functionName: 'acceptOwnershipBatch',
        args: [targets]
    });
}

/**
 * Give up one of your own roles. The chain requires `account` to be the caller,
 * so this is the one role change that does not wait.
 */
export const _renounceRole = async (client: WalletClient, role: Hex, account: Address) => {

    const values = await _resolve(client);

    if (!client.account) throw new MissingEOAWalletError();

    return client.writeContract({
        address: values.factoryAddresses.PROTOCOL_ADMIN,
        chain: values.chain,
        account: client.account.address,
        abi: ProtocolAdmin,
        functionName: 'renounceRole',
        args: [role, account]
    });
}

// ---------------------------------------------------------------------------
// Self-call payloads - only reachable through schedule
// ---------------------------------------------------------------------------

// These four are `msg.sender == address(this)` on chain, so they exist only as
// something to schedule. Each builds the `OwnerCall` to hand to `schedule`, which
// is why they return a call rather than sending one.

/** Grant a role. Pass the result to `schedule`. */
export const _grantRoleCall = async (client: WalletClient, role: Hex, account: Address): Promise<OwnerCall> => {

    const values = await _resolve(client);

    return {
        address: values.factoryAddresses.PROTOCOL_ADMIN,
        abi: ProtocolAdmin,
        functionName: 'grantRole',
        args: [role, account],
    };
}

/**
 * Revoke a role. Pass the result to `schedule`.
 *
 * Evicting a guardian takes two of these in one `scheduleBatch`, its guardian
 * role and its executor role, because the grant paired them but the revoke
 * cannot tell that pairing from an independent grant.
 */
export const _revokeRoleCall = async (client: WalletClient, role: Hex, account: Address): Promise<OwnerCall> => {

    const values = await _resolve(client);

    return {
        address: values.factoryAddresses.PROTOCOL_ADMIN,
        abi: ProtocolAdmin,
        functionName: 'revokeRole',
        args: [role, account],
    };
}

/**
 * Change the delay. Pass the result to `schedule`. `minDelayFloor` still clamps
 * whatever this writes, so it cannot take the timelock below the floor.
 */
export const _updateDelayCall = async (client: WalletClient, newDelay: bigint): Promise<OwnerCall> => {

    const values = await _resolve(client);

    return {
        address: values.factoryAddresses.PROTOCOL_ADMIN,
        abi: ProtocolAdmin,
        functionName: 'updateDelay',
        args: [newDelay],
    };
}

/**
 * Suspend a protocol contract's admin and nominate its replacement in one step.
 * Pass the result to `schedule`.
 *
 * The nominee still has to accept, and the role stays dormant until it does.
 */
export const _disableAndNominateCall = async (client: WalletClient, target: Address, newAdmin: Address): Promise<OwnerCall> => {

    const values = await _resolve(client);

    return {
        address: values.factoryAddresses.PROTOCOL_ADMIN,
        abi: ProtocolAdmin,
        functionName: 'disableAndNominate',
        args: [target, newAdmin],
    };
}
