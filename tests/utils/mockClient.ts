import { vi } from "vitest";
import type { WalletClient } from "viem";
import type { KokioSmartAccountClient } from "../../src/types.js";

/**
 * Builds a minimal stand-in for a viem `WalletClient` sufficient for the SDK's
 * off-chain code paths (chain-id lookup, transport URL, signer address).
 * No network is touched - `getChainId` resolves a fixed value.
 */
export const makeMockWalletClient = (opts: {
  chainId: number;
  url?: string;
  account?: `0x${string}`;
  readResult?: unknown;
  /** Per-function read results, for logic that reads several values in one call. */
  reads?: Record<string, unknown>;
  /**
   * Receipts `waitForTransactionReceipt` hands back, one per call in order. Supply
   * this to exercise logic that reads a batch's outcome off its own event.
   */
  receipts?: Array<{ logs: unknown[] }>;
  /** What `simulateContract` does. Throw from here to exercise a revert path. */
  simulate?: () => unknown;
  /** What `writeContract` does. Throw from here to exercise a revert path. */
  write?: () => unknown;
}): WalletClient => {
  const { chainId, url = "https://rpc.test.invalid", account, readResult = "0xreadresult", reads, receipts, simulate, write } = opts;

  // Each write gets its own hash so a test driving several batches can tell them
  // apart and check the order they were sent in.
  let sent = 0;
  const nextHash = () => `0x${(++sent).toString(16).padStart(64, "0")}`;

  let delivered = 0;

  // Reads extend the wallet client with `publicActions` before calling
  // `readContract`; the stub's `extend` returns the same object so tests can
  // assert against `client.readContract`.
  const client: Record<string, unknown> = {
    getChainId: async () => chainId,
    transport: { url },
    account: account ? { address: account, type: "json-rpc" } : undefined,
    // Every write must pass the client's own account object: with a bare address
    // viem sends eth_sendTransaction, which a local private key cannot answer.
    writeContract: vi.fn(async (arg: { account?: unknown }) => {
      if (arg.account !== client.account) throw new Error("writeContract was not given the client's account object");
      return write ? write() : (receipts ? nextHash() : "0xwritehash");
    }),
    readContract: vi.fn(async ({ functionName }: { functionName: string }) =>
      reads && functionName in reads ? reads[functionName] : readResult),
    waitForTransactionReceipt: vi.fn(async () => {
      const receipt = receipts?.[delivered++];
      if (!receipt) throw new Error(`Mock client has no receipt for transaction ${delivered}`);
      return receipt;
    }),
    simulateContract: vi.fn(async () => (simulate ? simulate() : { result: undefined })),
  };
  client.extend = () => client;

  return client as unknown as WalletClient;
};

// viem returns the user operation hash itself, not a wrapper object.
const SENT_USER_OP = "0xuserophash" as const;

/**
 * Builds a stand-in for the SDK's 4337 client. `sendUserOperation` is a spy so
 * tests can assert the `calls` array the SDK produces.
 * Pass `withAccount: false` to exercise the missing-smart-wallet guard.
 */
export const makeMockSmartAccountClient = (opts?: {
  chainId?: number;
  withAccount?: boolean;
  /** Per-function read results, for logic that reads before it sends. */
  reads?: Record<string, unknown>;
}): KokioSmartAccountClient => {
  // Base Sepolia: the only chain with a configured address book.
  const { chainId = 84532, withAccount = true, reads } = opts ?? {};

  return {
    getChainId: async () => chainId,
    transport: { url: "https://rpc.test.invalid" },
    account: withAccount
      ? { address: "0x000000000000000000000000000000000000acc7" }
      : undefined,
    sendUserOperation: vi.fn(async () => SENT_USER_OP),
    // `view` calls are issued via readContract (PublicActions), not userOps.
    readContract: vi.fn(async ({ functionName }: { functionName: string }) =>
      reads && functionName in reads ? reads[functionName] : "0xreadresult"),
  } as unknown as KokioSmartAccountClient;
};
