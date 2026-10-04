import { vi } from "vitest";

const passkeyGet = vi.hoisted(() => vi.fn());
vi.mock("react-native-passkey", () => ({ Passkey: { get: passkeyGet } }));

import { describeCouponPaymentFlow } from "./flows/couponPaymentFlow.js";
import { fundFromAdmin, startLiveStack } from "./fixtures/liveStack.js";

// The same flow on Base Sepolia with the real Pimlico bundler and paymaster, and
// the registry's real eSIM wallet admin as the backend. Sends real testnet
// transactions: the admin pays gas for ten and sends 0.40 USDCt to the device
// wallet. Run with `npm run test:consumer:live`.
describeCouponPaymentFlow("coupon payments on Base Sepolia with Pimlico", async () => {
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
}, passkeyGet, { timeout: 180_000, asset: "USDCt" });
