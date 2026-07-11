import { vi } from "vitest";
import type { WalletClient } from "viem";
import type { SmartAccountClient } from "@aa-sdk/core";

/**
 * Builds a minimal stand-in for a viem `WalletClient` sufficient for the SDK's
 * off-chain code paths (chain-id lookup, transport URL, signer address).
 * No network is touched — `getChainId` resolves a fixed value.
 */
export const makeMockWalletClient = (opts: {
  chainId: number;
  url?: string;
  account?: `0x${string}`;
}): WalletClient => {
  const { chainId, url = "https://rpc.test.invalid", account } = opts;

  return {
    getChainId: async () => chainId,
    transport: { url },
    account: account ? { address: account, type: "json-rpc" } : undefined,
    writeContract: vi.fn(async () => "0xwritehash"),
  } as unknown as WalletClient;
};

const SENT_USER_OP = { hash: "0xuserophash" } as const;

/**
 * Builds a stand-in for a 4337 `SmartAccountClient`. `sendUserOperation` is a
 * spy so tests can assert the `{ target, data }` UserOp the SDK produces.
 * Pass `withAccount: false` to exercise the missing-smart-wallet guard.
 */
export const makeMockSmartAccountClient = (opts?: {
  chainId?: number;
  withAccount?: boolean;
}): SmartAccountClient => {
  const { chainId = 11155111, withAccount = true } = opts ?? {};

  return {
    getChainId: async () => chainId,
    transport: { url: "https://rpc.test.invalid" },
    account: withAccount
      ? { address: "0x000000000000000000000000000000000000acc7" }
      : undefined,
    sendUserOperation: vi.fn(async () => SENT_USER_OP),
  } as unknown as SmartAccountClient;
};
