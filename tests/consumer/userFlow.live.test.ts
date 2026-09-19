import { vi } from "vitest";

const passkeyGet = vi.hoisted(() => vi.fn());
vi.mock("react-native-passkey", () => ({ Passkey: { get: passkeyGet } }));

import { describeUserFlow } from "./flows/userFlow.js";
import { fundFromAdmin, startLiveStack } from "./fixtures/liveStack.js";

// The same flow on Base Sepolia with the real Pimlico bundler and paymaster, and
// the registry's real eSIM wallet admin as the backend. Sends real testnet
// transactions: the admin pays gas for four and sends 2 USDCt and 1 USDC to the
// new device wallet. Run with `npm run test:consumer:live`.
describeUserFlow("user flow on Base Sepolia with Pimlico", async () => {
  const live = await startLiveStack();

  return {
    rpcUrl: live.target.rpcUrl,
    publicClient: live.publicClient,
    pimlicoAPIKey: live.target.pimlicoAPIKey,
    policyId: live.target.policyId,
    receiptUrl: `https://api.pimlico.io/v2/84532/rpc?apikey=${live.target.pimlicoAPIKey}`,
    admin: live.admin,
    fund: (token, to, amount) => fundFromAdmin(live, token, to, amount),
    priceUSDCents: 100n,
    // Hosted RPCs can answer from a node a block behind, so let each write settle.
    confirmations: 3,
    explorerTx: "https://sepolia.basescan.org/tx/",
  };
  // Mostly the internal test token; one purchase in Circle's Base Sepolia USDC.
}, passkeyGet, { timeout: 180_000, assets: ["USDCt", "USDC"] });
