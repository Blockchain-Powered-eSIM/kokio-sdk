import { vi } from "vitest";

const passkeyGet = vi.hoisted(() => vi.fn());
vi.mock("react-native-passkey", () => ({ Passkey: { get: passkeyGet } }));

import { describeCouponPaymentFlow } from "./flows/couponPaymentFlow.js";
import { startForkFlowTarget } from "./fixtures/forkFlowTarget.js";

describeCouponPaymentFlow("coupon payments on a Base Sepolia fork", startForkFlowTarget, passkeyGet, { timeout: 120_000, asset: "USDC" });
