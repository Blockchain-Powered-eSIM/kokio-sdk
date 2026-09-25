import { vi } from "vitest";

const passkeyGet = vi.hoisted(() => vi.fn());
vi.mock("react-native-passkey", () => ({ Passkey: { get: passkeyGet } }));

import { describeLazyWalletDeployFlow } from "./flows/lazyWalletDeployFlow.js";
import { startForkFlowTarget } from "./fixtures/forkFlowTarget.js";

describeLazyWalletDeployFlow("lazy wallet deploy on a Base Sepolia fork", startForkFlowTarget, passkeyGet, { timeout: 300_000 });
