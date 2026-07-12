import { createPublicClient, http, type PublicClient, type WalletClient } from "viem";
import { baseSepolia } from "viem/chains";

/**
 * Live Base Sepolia client factory for the opt-in integration tier.
 *
 * Unlike the mocked `mockClient.ts` helpers, these touch a REAL RPC and are only
 * exercised by `*.integration.test.ts` under `npm run test:integration`. Reads
 * only - no account, no bundler, no funds - so a plain RPC URL is all that's
 * required (`BASE_SEPOLIA_RPC_URL`).
 */

/** True when a Base Sepolia RPC URL is configured - gates the integration suite. */
export const hasRpc = (): boolean => !!process.env.BASE_SEPOLIA_RPC_URL;

/** The configured RPC URL, or throws if the suite ran without gating on {@link hasRpc}. */
export const getRpcUrl = (): string => {
  const url = process.env.BASE_SEPOLIA_RPC_URL;
  if (!url) {
    throw new Error(
      "BASE_SEPOLIA_RPC_URL is not set - copy .env.example to .env and fill it in, " +
        "or run the offline unit suite with `npm test`.",
    );
  }
  return url;
};

/** A real public client for raw reads (getChainId, getCode, readContract). */
export const makeBaseSepoliaPublicClient = (): PublicClient =>
  createPublicClient({ chain: baseSepolia, transport: http(getRpcUrl()) });

/**
 * A read-capable client shaped as the `WalletClient` the SDK's off-chain helpers
 * (`getCounterFactualAddress`, `_assertCounterfactualMatchesOnChain`) accept.
 * Those helpers only ever call `getChainId()`, read `transport.url`, and issue
 * contract *reads* via `getContract({ client }).read.*` - all of which a public
 * client satisfies. It carries no account, so no write path can be reached.
 */
export const makeBaseSepoliaReadClient = (): WalletClient =>
  makeBaseSepoliaPublicClient() as unknown as WalletClient;
