import { Address, Hex, WalletClient } from "viem";
import {
    _operationId,
    _operationIdBatch,
    _schedule,
    _scheduleBatch,
    _scheduleRaw,
    _execute,
    _executeBatch,
    _executeRaw,
    _cancel,
    _unpauseInstantly,
    _revokeCancellersInstantly,
    _disableAdminInstantly,
    _acceptOwnershipBatch,
    _renounceRole,
    _grantRoleCall,
    _revokeRoleCall,
    _updateDelayCall,
    _disableAndNominateCall,
    _disableAdminCall,
    _enableAdminCall,
    _unpauseCall,
    _setDefaultDataBundlePriceCapCall,
} from "../../logic/admin/protocolAdmin.eoa.js";
import {
    _getMinDelay,
    _minDelayFloor,
    _getOperationState,
    _getTimestamp,
    _isOperation,
    _isOperationPending,
    _isOperationReady,
    _isOperationDone,
    _hasRole,
    _getRoleAdmin,
    _defaultAdminRole,
    _proposerRole,
    _cancellerRole,
    _executorRole,
    _guardianRole,
} from "../../logic/admin/reads/protocolAdmin.reads.js";
import type { OperationOptions, OwnerCall, ScheduledBatchOperation, ScheduledOperation } from "../../types.js";

/** Schedules operations. Needs an EOA holding `PROPOSER_ROLE`. */
export class ProtocolAdminProposerSubPackage {

    walletClient: WalletClient;

    constructor(walletClient: WalletClient) {
        this.walletClient = walletClient;
    }

    schedule(call: OwnerCall, opts?: OperationOptions, delay?: bigint) {
        return _schedule(this.walletClient, call, opts, delay);
    }

    scheduleBatch(calls: readonly OwnerCall[], opts?: OperationOptions, delay?: bigint) {
        return _scheduleBatch(this.walletClient, calls, opts, delay);
    }

    scheduleRaw(target: Address, value: bigint, payload: Hex, predecessor: Hex, salt: Hex, delay: bigint) {
        return _scheduleRaw(this.walletClient, target, value, payload, predecessor, salt, delay);
    }
}

/** Runs operations whose delay has elapsed. Open to any funded EOA. */
export class ProtocolAdminExecutorSubPackage {

    walletClient: WalletClient;

    constructor(walletClient: WalletClient) {
        this.walletClient = walletClient;
    }

    execute(operation: ScheduledOperation) {
        return _execute(this.walletClient, operation);
    }

    executeBatch(operation: ScheduledBatchOperation) {
        return _executeBatch(this.walletClient, operation);
    }

    executeRaw(target: Address, value: bigint, payload: Hex, predecessor: Hex, salt: Hex) {
        return _executeRaw(this.walletClient, target, value, payload, predecessor, salt);
    }
}

/** Drops a scheduled operation. Needs `CANCELLER_ROLE`, which proposers also hold. */
export class ProtocolAdminCancellerSubPackage {

    walletClient: WalletClient;

    constructor(walletClient: WalletClient) {
        this.walletClient = walletClient;
    }

    cancel(id: Hex) {
        return _cancel(this.walletClient, id);
    }
}

/**
 * The three instant powers. Needs `GUARDIAN_ROLE`.
 *
 * Each one takes something away and none grants anything, which is what keeps
 * the role away from user funds. Undoing any of them is an owner action and
 * waits, so the side taking power away wins the race against the side handing it
 * back.
 */
export class ProtocolAdminGuardianSubPackage {

    walletClient: WalletClient;

    constructor(walletClient: WalletClient) {
        this.walletClient = walletClient;
    }

    unpauseInstantly(target: Address) {
        return _unpauseInstantly(this.walletClient, target);
    }

    revokeCancellersInstantly(accounts: readonly Address[]) {
        return _revokeCancellersInstantly(this.walletClient, accounts);
    }

    disableAdminInstantly(target?: Address) {
        return _disableAdminInstantly(this.walletClient, target);
    }
}

/**
 * The timelock that owns `Registry`, `LazyWalletRegistry`, `DeviceWalletFactory`
 * and `ESIMWalletFactory`.
 *
 * Owner calls go one way: `proposer.schedule` announces one, the delay elapses,
 * and `executor.execute` runs it. The role surfaces are separate because they
 * need different keys, and `executor` needs no role at all.
 *
 * ```ts
 * const op = await admin.protocolAdmin.proposer.schedule({
 *     address: registryAddress,
 *     abi: Registry,
 *     functionName: "updateVaultAddress",
 *     args: [newVault],
 * });
 * // ... wait out admin.protocolAdmin.getMinDelay() ...
 * await admin.protocolAdmin.executor.execute(op);
 * ```
 */
export class AdminProtocolAdminSubPackage {

    walletClient: WalletClient;

    proposer: ProtocolAdminProposerSubPackage;
    executor: ProtocolAdminExecutorSubPackage;
    canceller: ProtocolAdminCancellerSubPackage;
    guardian: ProtocolAdminGuardianSubPackage;

    constructor(walletClient: WalletClient) {
        this.walletClient = walletClient;

        this.proposer = new ProtocolAdminProposerSubPackage(walletClient);
        this.executor = new ProtocolAdminExecutorSubPackage(walletClient);
        this.canceller = new ProtocolAdminCancellerSubPackage(walletClient);
        this.guardian = new ProtocolAdminGuardianSubPackage(walletClient);
    }

    // Writes that need no role

    acceptOwnershipBatch(targets: readonly Address[]) {
        return _acceptOwnershipBatch(this.walletClient, targets);
    }

    renounceRole(role: Hex, account: Address) {
        return _renounceRole(this.walletClient, role, account);
    }

    // Payload builders for the self-call-only functions. Hand the result to
    // `proposer.schedule`; there is no way to call these directly.

    grantRoleCall(role: Hex, account: Address) {
        return _grantRoleCall(this.walletClient, role, account);
    }

    revokeRoleCall(role: Hex, account: Address) {
        return _revokeRoleCall(this.walletClient, role, account);
    }

    updateDelayCall(newDelay: bigint) {
        return _updateDelayCall(this.walletClient, newDelay);
    }

    disableAndNominateCall(target: Address, newAdmin: Address) {
        return _disableAndNominateCall(this.walletClient, target, newAdmin);
    }

    // Payload builders for the target contract's own owner functions. Same
    // route: hand the result to `proposer.schedule`.

    disableAdminCall(target?: Address) {
        return _disableAdminCall(this.walletClient, target);
    }

    enableAdminCall(target?: Address) {
        return _enableAdminCall(this.walletClient, target);
    }

    unpauseCall(target?: Address) {
        return _unpauseCall(this.walletClient, target);
    }

    setDefaultDataBundlePriceCapCall(cap: bigint, target?: Address) {
        return _setDefaultDataBundlePriceCapCall(this.walletClient, cap, target);
    }

    // Operation ids

    operationId(call: OwnerCall, opts?: OperationOptions) {
        return _operationId(this.walletClient, call, opts);
    }

    operationIdBatch(calls: readonly OwnerCall[], opts?: OperationOptions) {
        return _operationIdBatch(this.walletClient, calls, opts);
    }

    // Reads

    getMinDelay() {
        return _getMinDelay(this.walletClient);
    }

    minDelayFloor() {
        return _minDelayFloor(this.walletClient);
    }

    getOperationState(id: Hex) {
        return _getOperationState(this.walletClient, id);
    }

    getTimestamp(id: Hex) {
        return _getTimestamp(this.walletClient, id);
    }

    isOperation(id: Hex) {
        return _isOperation(this.walletClient, id);
    }

    isOperationPending(id: Hex) {
        return _isOperationPending(this.walletClient, id);
    }

    isOperationReady(id: Hex) {
        return _isOperationReady(this.walletClient, id);
    }

    isOperationDone(id: Hex) {
        return _isOperationDone(this.walletClient, id);
    }

    hasRole(role: Hex, account: Address) {
        return _hasRole(this.walletClient, role, account);
    }

    getRoleAdmin(role: Hex) {
        return _getRoleAdmin(this.walletClient, role);
    }

    // Role ids, read off the contract rather than hardcoded

    DEFAULT_ADMIN_ROLE() {
        return _defaultAdminRole(this.walletClient);
    }

    PROPOSER_ROLE() {
        return _proposerRole(this.walletClient);
    }

    CANCELLER_ROLE() {
        return _cancellerRole(this.walletClient);
    }

    EXECUTOR_ROLE() {
        return _executorRole(this.walletClient);
    }

    GUARDIAN_ROLE() {
        return _guardianRole(this.walletClient);
    }
}
