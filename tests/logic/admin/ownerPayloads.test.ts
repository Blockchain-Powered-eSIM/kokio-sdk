import { describe, it, expect } from "vitest";
import { type Address, type Hex } from "viem";

import { makeMockWalletClient } from "../../utils/mockClient.js";
import { baseSepoliaFactoryAddresses } from "../../../src/logic/constants.js";
import type { Asset } from "../../../src/types.js";

import * as registry from "../../../src/logic/admin/registry.eoa.js";
import * as lazyWalletRegistry from "../../../src/logic/admin/lazyWalletRegistry.eoa.js";
import * as deviceWalletFactory from "../../../src/logic/admin/deviceWalletFactory.eoa.js";
import * as eSIMWalletFactory from "../../../src/logic/admin/eSIMWalletFactory.eoa.js";
import * as paymentAdapter from "../../../src/logic/admin/paymentAdapter.eoa.js";

// --- Fixtures ---------------------------------------------------------------
const EOA = "0x00000000000000000000000000000000000e0a01" as Address;
const NEW_OWNER = "0x000000000000000000000000000000000000b055" as Address;
const IMPL = "0x0000000000000000000000000000000000009e11" as Address;
const INIT_DATA = "0xdeadbeef" as Hex;
const ASSET = "0x5553444300000000000000000000000000000000000000000000000000000000" as Hex;
const TOKEN = "0x0000000000000000000000000000000000706b31" as Address;
const ASSET_ENTRY: Asset = { allowed: true, isDollarUnit: false, decimals: 6, token: TOKEN };

const F = baseSepoliaFactoryAddresses;
const CHAIN_ID = 84532;

// The Ownable2Step and UUPS writes on the four UUPS singletons. All are
// `onlyOwner`, and the owner is the timelock, so the SDK returns the call to
// schedule rather than sending one. Each row pins the target address, since
// aiming a payload at the wrong proxy is the mistake that matters here.
const payloadCases: Array<{
  label: string;
  run: (c: ReturnType<typeof makeMockWalletClient>) => Promise<{ address: Address; functionName: string; args?: readonly unknown[] }>;
  address: Address;
  functionName: string;
  args: readonly unknown[];
}> = [
  // registry.eoa (target = REGISTRY)
  { label: "registry._transferOwnershipCall", run: (c) => registry._transferOwnershipCall(c, NEW_OWNER), address: F.REGISTRY, functionName: "transferOwnership", args: [NEW_OWNER] },
  { label: "registry._upgradeCall", run: (c) => registry._upgradeCall(c, IMPL, INIT_DATA), address: F.REGISTRY, functionName: "upgradeToAndCall", args: [IMPL, INIT_DATA] },
  // lazyWalletRegistry.eoa (target = LAZY_WALLET_REGISTRY)
  { label: "lazyWalletRegistry._transferOwnershipCall", run: (c) => lazyWalletRegistry._transferOwnershipCall(c, NEW_OWNER), address: F.LAZY_WALLET_REGISTRY, functionName: "transferOwnership", args: [NEW_OWNER] },
  { label: "lazyWalletRegistry._upgradeCall", run: (c) => lazyWalletRegistry._upgradeCall(c, IMPL, INIT_DATA), address: F.LAZY_WALLET_REGISTRY, functionName: "upgradeToAndCall", args: [IMPL, INIT_DATA] },
  // deviceWalletFactory.eoa (target = DEVICE_WALLET_FACTORY, the factory's own proxy, not the beacon)
  { label: "deviceWalletFactory._transferOwnershipCall", run: (c) => deviceWalletFactory._transferOwnershipCall(c, NEW_OWNER), address: F.DEVICE_WALLET_FACTORY, functionName: "transferOwnership", args: [NEW_OWNER] },
  { label: "deviceWalletFactory._upgradeCall", run: (c) => deviceWalletFactory._upgradeCall(c, IMPL, INIT_DATA), address: F.DEVICE_WALLET_FACTORY, functionName: "upgradeToAndCall", args: [IMPL, INIT_DATA] },
  // eSIMWalletFactory.eoa (target = ESIM_WALLET_FACTORY, the factory's own proxy, not the beacon)
  { label: "eSIMWalletFactory._transferOwnershipCall", run: (c) => eSIMWalletFactory._transferOwnershipCall(c, NEW_OWNER), address: F.ESIM_WALLET_FACTORY, functionName: "transferOwnership", args: [NEW_OWNER] },
  { label: "eSIMWalletFactory._upgradeCall", run: (c) => eSIMWalletFactory._upgradeCall(c, IMPL, INIT_DATA), address: F.ESIM_WALLET_FACTORY, functionName: "upgradeToAndCall", args: [IMPL, INIT_DATA] },
  // paymentAdapter.eoa (target = PAYMENT_ADAPTER)
  { label: "paymentAdapter._transferOwnershipCall", run: (c) => paymentAdapter._transferOwnershipCall(c, NEW_OWNER), address: F.PAYMENT_ADAPTER, functionName: "transferOwnership", args: [NEW_OWNER] },
  { label: "paymentAdapter._upgradeCall", run: (c) => paymentAdapter._upgradeCall(c, IMPL, INIT_DATA), address: F.PAYMENT_ADAPTER, functionName: "upgradeToAndCall", args: [IMPL, INIT_DATA] },
  { label: "paymentAdapter._registerAssetCall", run: (c) => paymentAdapter._registerAssetCall(c, ASSET, ASSET_ENTRY), address: F.PAYMENT_ADAPTER, functionName: "registerAsset", args: [ASSET, ASSET_ENTRY] },
  { label: "paymentAdapter._updateAssetCall", run: (c) => paymentAdapter._updateAssetCall(c, ASSET, ASSET_ENTRY), address: F.PAYMENT_ADAPTER, functionName: "updateAsset", args: [ASSET, ASSET_ENTRY] },
];

describe("owner payloads", () => {
  it.each(payloadCases)("$label builds a call aimed at its own proxy", async ({ run, address, functionName, args }) => {
    const call = await run(makeMockWalletClient({ chainId: CHAIN_ID, account: EOA }));

    expect(call.address).toBe(address);
    expect(call.functionName).toBe(functionName);
    expect(call.args).toEqual(args);
  });

  it("builds a payload without an account, since nothing is sent", async () => {
    const call = await registry._transferOwnershipCall(makeMockWalletClient({ chainId: CHAIN_ID }), NEW_OWNER);

    expect(call.functionName).toBe("transferOwnership");
  });

  it("upgradeCall leaves the init data empty when none is given", async () => {
    const call = await registry._upgradeCall(makeMockWalletClient({ chainId: CHAIN_ID, account: EOA }), IMPL);

    expect(call.args).toEqual([IMPL, "0x"]);
  });
});
