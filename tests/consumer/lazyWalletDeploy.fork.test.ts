import { vi } from "vitest";

const passkeyGet = vi.hoisted(() => vi.fn());
vi.mock("react-native-passkey", () => ({ Passkey: { get: passkeyGet } }));

import { FORK_NETWORK, forkProfile } from "../utils/forkChain.js";
import { describeLazyWalletDeployFlow } from "./flows/lazyWalletDeployFlow.js";
import { startForkFlowTarget } from "./fixtures/forkFlowTarget.js";

// USDCt is the team's own Base Sepolia token. Mainnet pays in native USDC.
describeLazyWalletDeployFlow(`lazy wallet deploy on a ${forkProfile().label} fork`, startForkFlowTarget, passkeyGet, {
  timeout: 300_000,
  asset: FORK_NETWORK === "base" ? "USDC" : "USDCt",
});
