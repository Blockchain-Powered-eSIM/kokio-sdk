import { Address, Hex, WalletClient, publicActions } from "viem";
import { _getChainSpecificConstants } from "../../constants.js";
import { ProtocolAdmin } from "../../../abis/index.js";

// Read-only logic for `ProtocolAdmin`, the timelock that owns the four
// upgradeable contracts. Every read extends the `WalletClient` with
// `publicActions`; no EOA account is required.

/** Operation lifecycle, matching the on-chain `OperationState` enum. */
export enum OperationState {
    Unset = 0,
    Waiting = 1,
    Ready = 2,
    Done = 3,
}

const _resolve = async (client: WalletClient) => {
    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    return _getChainSpecificConstants(chainID, rpcURL);
}

/**
 * Shortest delay a new operation will be given. Read this rather than following
 * `MinDelayChange`, which carries the value `updateDelay` stored and not the
 * floor that overrides it.
 */
export const _getMinDelay = async (client: WalletClient): Promise<bigint> => {

    const values = await _resolve(client);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.PROTOCOL_ADMIN,
        abi: ProtocolAdmin,
        functionName: "getMinDelay",
        args: []
    }) as Promise<bigint>;
}

/**
 * The floor `getMinDelay` clamps to. Immutable, so `updateDelay` can never bring
 * the timelock below it.
 */
export const _minDelayFloor = async (client: WalletClient): Promise<bigint> => {

    const values = await _resolve(client);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.PROTOCOL_ADMIN,
        abi: ProtocolAdmin,
        functionName: "minDelayFloor",
        args: []
    }) as Promise<bigint>;
}

/** Where an operation is in its lifecycle. */
export const _getOperationState = async (client: WalletClient, id: Hex): Promise<OperationState> => {

    const values = await _resolve(client);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.PROTOCOL_ADMIN,
        abi: ProtocolAdmin,
        functionName: "getOperationState",
        args: [id]
    }) as Promise<OperationState>;
}

/**
 * When an operation becomes executable, as a unix timestamp. Reads `0` for an
 * unknown operation and the literal `1` for one already done, so compare against
 * the state rather than treating this as a time in both cases.
 */
export const _getTimestamp = async (client: WalletClient, id: Hex): Promise<bigint> => {

    const values = await _resolve(client);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.PROTOCOL_ADMIN,
        abi: ProtocolAdmin,
        functionName: "getTimestamp",
        args: [id]
    }) as Promise<bigint>;
}

/** Whether the timelock has ever seen this operation. */
export const _isOperation = async (client: WalletClient, id: Hex): Promise<boolean> => {

    const values = await _resolve(client);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.PROTOCOL_ADMIN,
        abi: ProtocolAdmin,
        functionName: "isOperation",
        args: [id]
    }) as Promise<boolean>;
}

/** Scheduled and not yet executed, whether or not the delay has elapsed. */
export const _isOperationPending = async (client: WalletClient, id: Hex): Promise<boolean> => {

    const values = await _resolve(client);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.PROTOCOL_ADMIN,
        abi: ProtocolAdmin,
        functionName: "isOperationPending",
        args: [id]
    }) as Promise<boolean>;
}

/** The delay has elapsed and the operation can be executed now. */
export const _isOperationReady = async (client: WalletClient, id: Hex): Promise<boolean> => {

    const values = await _resolve(client);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.PROTOCOL_ADMIN,
        abi: ProtocolAdmin,
        functionName: "isOperationReady",
        args: [id]
    }) as Promise<boolean>;
}

/** The operation has already run. */
export const _isOperationDone = async (client: WalletClient, id: Hex): Promise<boolean> => {

    const values = await _resolve(client);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.PROTOCOL_ADMIN,
        abi: ProtocolAdmin,
        functionName: "isOperationDone",
        args: [id]
    }) as Promise<boolean>;
}

/** Whether an account holds a role. Role ids come from the constants below. */
export const _hasRole = async (client: WalletClient, role: Hex, account: Address): Promise<boolean> => {

    const values = await _resolve(client);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.PROTOCOL_ADMIN,
        abi: ProtocolAdmin,
        functionName: "hasRole",
        args: [role, account]
    }) as Promise<boolean>;
}

/**
 * The role that can grant and revoke the given one. Always `DEFAULT_ADMIN_ROLE`,
 * which only the timelock itself holds, so every role change is a scheduled
 * operation.
 */
export const _getRoleAdmin = async (client: WalletClient, role: Hex): Promise<Hex> => {

    const values = await _resolve(client);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.PROTOCOL_ADMIN,
        abi: ProtocolAdmin,
        functionName: "getRoleAdmin",
        args: [role]
    }) as Promise<Hex>;
}

// Reads one of the five role id constants off the contract.
const _roleConstant = async (
    client: WalletClient,
    functionName: "DEFAULT_ADMIN_ROLE" | "PROPOSER_ROLE" | "CANCELLER_ROLE" | "EXECUTOR_ROLE" | "GUARDIAN_ROLE"
): Promise<Hex> => {

    const values = await _resolve(client);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.PROTOCOL_ADMIN,
        abi: ProtocolAdmin,
        functionName,
        args: []
    }) as Promise<Hex>;
}

/** Held only by the timelock itself, which is what makes role changes wait. */
export const _defaultAdminRole = (client: WalletClient) => _roleConstant(client, "DEFAULT_ADMIN_ROLE");

/** Can schedule operations, and can cancel them. */
export const _proposerRole = (client: WalletClient) => _roleConstant(client, "PROPOSER_ROLE");

/** Can cancel a scheduled operation and nothing else. */
export const _cancellerRole = (client: WalletClient) => _roleConstant(client, "CANCELLER_ROLE");

/** Granted to the zero address, so execution is open to anyone. */
export const _executorRole = (client: WalletClient) => _roleConstant(client, "EXECUTOR_ROLE");

/** The three instant powers. Cannot be held alongside proposer or canceller. */
export const _guardianRole = (client: WalletClient) => _roleConstant(client, "GUARDIAN_ROLE");
