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
}): WalletClient => {
  const { chainId, url = "https://rpc.test.invalid", account, readResult = "0xreadresult" } = opts;

  // Reads extend the wallet client with `publicActions` before calling
  // `readContract`; the stub's `extend` returns the same object so tests can
  // assert against `client.readContract`.
  const client: Record<string, unknown> = {
    getChainId: async () => chainId,
    transport: { url },
    account: account ? { address: account, type: "json-rpc" } : undefined,
    writeContract: vi.fn(async () => "0xwritehash"),
    readContract: vi.fn(async () => readResult),
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
}): KokioSmartAccountClient => {
  const { chainId = 11155111, withAccount = true } = opts ?? {};

  return {
    getChainId: async () => chainId,
    transport: { url: "https://rpc.test.invalid" },
    account: withAccount
      ? { address: "0x000000000000000000000000000000000000acc7" }
      : undefined,
    sendUserOperation: vi.fn(async () => SENT_USER_OP),
    // `view` calls are issued via readContract (PublicActions), not userOps.
    readContract: vi.fn(async () => "0xreadresult"),
  } as unknown as KokioSmartAccountClient;
};
