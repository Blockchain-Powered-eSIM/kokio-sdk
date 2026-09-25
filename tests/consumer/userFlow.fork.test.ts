import { vi } from "vitest";

const passkeyGet = vi.hoisted(() => vi.fn());
vi.mock("react-native-passkey", () => ({ Passkey: { get: passkeyGet } }));

import { describeUserFlow } from "./flows/userFlow.js";
import { startForkFlowTarget } from "./fixtures/forkFlowTarget.js";

describeUserFlow("user flow on a Base Sepolia fork", startForkFlowTarget, passkeyGet, { timeout: 120_000, assets: ["USDC", "USDCt"] });
