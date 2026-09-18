import { stringToHex, type Hex } from "viem";

// Everything these suites put onchain carries this tag, so their wallets and
// purchases on Base Sepolia are easy to tell apart from people testing the app.
export const TEST_TAG = "kokio-sdk-test";

export const RP_ID = `${TEST_TAG}.local`;
export const CREDENTIAL_ID = `${TEST_TAG}-credential`;

/** Device identifier, unique per run. Emitted as-is in `DeviceWalletInfoUpdated`. */
export const testDeviceId = () => `${TEST_TAG}-device-${Date.now()}`;

/** A bytes32 that reads as `kokio-sdk-test:<name>` on a block explorer. */
export const testBytes32 = (name: string): Hex => stringToHex(`${TEST_TAG}:${name}`, { size: 32 });
