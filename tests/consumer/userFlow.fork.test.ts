import { vi } from "vitest";

const passkeyGet = vi.hoisted(() => vi.fn());
vi.mock("react-native-passkey", () => ({ Passkey: { get: passkeyGet } }));

import { forkProfile } from "../utils/forkChain.js";
import { describeUserFlow } from "./flows/userFlow.js";
import { startForkFlowTarget } from "./fixtures/forkFlowTarget.js";

const [primary, ...others] = forkProfile().assets;
describeUserFlow(`user flow on a ${forkProfile().label} fork`, startForkFlowTarget, passkeyGet, { timeout: 120_000, assets: [primary, ...others] });
