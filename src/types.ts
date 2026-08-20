import { Abi, Address, Chain, Hex, PublicActions, Transport } from "viem";
import type { BundlerClient, SmartAccount } from "viem/account-abstraction";

export type P256Key = [Hex, Hex];

/**
 * One call inside a user operation: target, optional ETH value, optional
 * calldata. A single `Call` encodes to the account's `execute`, several
 * batch atomically through `executeBatch`.
 */
export type Call = {
    to: Address;
    value?: bigint;
    data?: Hex;
}

/**
 * A call the `ProtocolAdmin` timelock makes on a contract it owns. Same shape as
 * a viem `writeContract`, because that is what it becomes once the delay is served.
 */
export type OwnerCall = {
    address: Address;
    abi: Abi;
    functionName: string;
    args?: readonly unknown[];
    /** ETH sent with the call. The timelock has to be holding it. */
    value?: bigint;
}

/**
 * Optional operation fields. Both default to zero, which makes the operation id a
 * function of the call alone, so it can be recomputed later from the same
 * arguments. Pass a `salt` to schedule a call the timelock has already run once.
 */
export type OperationOptions = {
    salt?: Hex;
    /** Operation that has to be done before this one can execute. */
    predecessor?: Hex;
}

/**
 * What `schedule` returns. Hand the whole object to `execute`: the timelock
 * recomputes the id from these fields, so anything altered makes it look up an
 * operation that was never scheduled.
 */
export type ScheduledOperation = {
    /** Transaction hash of the `schedule` call, not the operation id. */
    hash: Hex;
    id: Hex;
    target: Address;
    value: bigint;
    payload: Hex;
    predecessor: Hex;
    salt: Hex;
    /** Delay requested. `getTimestamp(id)` is when it can actually run. */
    delay: bigint;
}

/**
 * What `scheduleBatch` returns. A batch hashes differently from a single call, so
 * this stays a separate type: a one-call batch is not the same operation as the
 * same call scheduled on its own, and only `executeBatch` can run it.
 */
export type ScheduledBatchOperation = {
    hash: Hex;
    id: Hex;
    targets: readonly Address[];
    values: readonly bigint[];
    payloads: readonly Hex[];
    predecessor: Hex;
    salt: Hex;
    delay: bigint;
}

/** The device wallet, as an ERC-4337 account on EntryPoint v0.8. */
export type KokioSmartAccount = SmartAccount;

/**
 * Sends user operations and reads contracts through one client. viem's bundler
 * client carries no public actions, so the SDK adds them.
 */
export type KokioSmartAccountClient =
    BundlerClient<Transport, Chain, SmartAccount> & PublicActions<Transport, Chain>;

export type WebAuthnSignature = {
    authenticatorData: Hex,
    clientDataJSON: string,
    challengeIndex: bigint,
    typeIndex: bigint,
    r: bigint,
    s: bigint  
}

export type P256Credential = {
    rawId: Hex;
    clientData: {
      type: string;
      challenge: string;
      origin: string;
      crossOrigin: boolean;
    };
    authenticatorData: Hex;
    signature: {r: Hex, s: Hex};
};

export type DataBundleDetails = {
    // Field name must match the on-chain `DataBundleDetails` struct
    // (ESIMWallet.sol) - viem's `as const` ABIs encode by exact key.
    dataBundleID: string;
    dataBundlePrice: bigint;
}

/** One `deployMoreESIMWalletsForLazyDevice` (or first) transaction, read back from its receipt. */
export type LazyDeploymentBatch = {
    hash: Hex;
    /** Wallets this batch deployed, in the order of the device's identifier list. */
    eSIMWallets: readonly Address[];
    eSIMIdentifiers: readonly string[];
    /** eSIM wallets still waiting after this batch. Zero means the device is done. */
    remaining: bigint;
}

/**
 * What a fully paginated lazy deployment did. `eSIMWallets` and `eSIMIdentifiers`
 * cover only the batches this call ran, so a resume reports what it finished
 * rather than the device's whole set.
 */
export type LazyDeployment = {
    deviceWallet: Address;
    eSIMWallets: readonly Address[];
    eSIMIdentifiers: readonly string[];
    batches: readonly LazyDeploymentBatch[];
    /** Every eSIM wallet already existed, so nothing was sent. */
    alreadyComplete: boolean;
}

/** One `setHistoryForLazyWallet` transaction, read back from its receipt. */
export type LazyHistoryBatch = {
    hash: Hex;
    copied: bigint;
    /** Entries still waiting after this batch. Zero means the copy is done. */
    remaining: bigint;
}

/** What a fully paginated history copy did, for one eSIM. */
export type LazyHistoryCopy = {
    eSIMWallet: Address;
    /** Entries written by this call, across every batch it ran. */
    copied: bigint;
    batches: readonly LazyHistoryBatch[];
    /** The history was already fully copied, so nothing was sent. */
    alreadyComplete: boolean;
}

export type SignedRequest = {
    body: string;
    stamp : {
        stampHeader: string;
        stampHeaderValue: string;
    }
    url: string;
}
