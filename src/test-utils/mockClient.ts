import type { WalletClient } from "viem";

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
  } as unknown as WalletClient;
};
