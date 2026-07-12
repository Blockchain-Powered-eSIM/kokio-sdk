import { describe, it, expect, vi } from "vitest";
import { type Address, type Hex } from "viem";

import { makeMockWalletClient } from "../../utils/mockClient.js";
import { sepoliaFactoryAddresses } from "../../../src/logic/constants.js";

import * as deviceWalletFactory from "../../../src/logic/admin/reads/deviceWalletFactory.reads.js";
import * as eSIMWalletFactory from "../../../src/logic/admin/reads/eSIMWalletFactory.reads.js";
import * as registry from "../../../src/logic/admin/reads/registry.reads.js";
import * as lazyWalletRegistry from "../../../src/logic/admin/reads/lazyWalletRegistry.reads.js";
import * as deviceWallet from "../../../src/logic/admin/reads/deviceWallet.reads.js";
import * as eSIMWallet from "../../../src/logic/admin/reads/eSIMWallet.reads.js";

// --- Fixtures ---------------------------------------------------------------
const WALLET = "0x00000000000000000000000000000000000dead1" as Address;
const ESIM = "0x00000000000000000000000000000000000e51a1" as Address;
const HASH = "0x00000000000000000000000000000000000000000000000000000000000000a1" as Hex;
const OWNER_KEY: [Hex, Hex] = [
  "0x6B17D1F2E12C4247F8BCE6E563A440F277037D812DEB33A0F4A13945D898C291",
  "0x4FE342E2FE1A7F9B8EE7EB4A7C0F9E162BCE33576B315ECECBB6406837BF51F1",
];

const F = sepoliaFactoryAddresses;
const CHAIN_ID = 11155111;

/**
 * Every admin read. Each row asserts the SDK issues a `readContract` (via the
 * `publicActions`-extended client) against the expected address / functionName /
 * args, matching the on-chain getter signature. Reads never require an account.
 */
const readCases: Array<{
  label: string;
  run: (c: ReturnType<typeof makeMockWalletClient>) => Promise<unknown>;
  address: Address;
  functionName: string;
  args: readonly unknown[];
}> = [
  // deviceWalletFactory.reads (target = DEVICE_WALLET_FACTORY)
  { label: "deviceWalletFactory._eSIMWalletAdmin", run: (c) => deviceWalletFactory._eSIMWalletAdmin(c), address: F.DEVICE_WALLET_FACTORY, functionName: "eSIMWalletAdmin", args: [] },
  { label: "deviceWalletFactory._vault", run: (c) => deviceWalletFactory._vault(c), address: F.DEVICE_WALLET_FACTORY, functionName: "vault", args: [] },
  { label: "deviceWalletFactory._newRequestedAdmin", run: (c) => deviceWalletFactory._newRequestedAdmin(c), address: F.DEVICE_WALLET_FACTORY, functionName: "newRequestedAdmin", args: [] },
  { label: "deviceWalletFactory._deviceWalletInfoAdded", run: (c) => deviceWalletFactory._deviceWalletInfoAdded(c, WALLET), address: F.DEVICE_WALLET_FACTORY, functionName: "deviceWalletInfoAdded", args: [WALLET] },
  { label: "deviceWalletFactory._getCurrentDeviceWalletImplementation", run: (c) => deviceWalletFactory._getCurrentDeviceWalletImplementation(c), address: F.DEVICE_WALLET_FACTORY, functionName: "getCurrentDeviceWalletImplementation", args: [] },
  { label: "deviceWalletFactory._getCounterFactualAddress", run: (c) => deviceWalletFactory._getCounterFactualAddress(c, OWNER_KEY, "Device_11", 1n), address: F.DEVICE_WALLET_FACTORY, functionName: "getCounterFactualAddress", args: [OWNER_KEY, "Device_11", 1n] },

  // eSIMWalletFactory.reads (target = ESIM_WALLET_FACTORY)
  { label: "eSIMWalletFactory._isESIMWalletDeployed", run: (c) => eSIMWalletFactory._isESIMWalletDeployed(c, ESIM), address: F.ESIM_WALLET_FACTORY, functionName: "isESIMWalletDeployed", args: [ESIM] },
  { label: "eSIMWalletFactory._getCurrentESIMWalletImplementation", run: (c) => eSIMWalletFactory._getCurrentESIMWalletImplementation(c), address: F.ESIM_WALLET_FACTORY, functionName: "getCurrentESIMWalletImplementation", args: [] },

  // registry.reads (target = REGISTRY)
  { label: "registry._eSIMWalletAdmin", run: (c) => registry._eSIMWalletAdmin(c), address: F.REGISTRY, functionName: "eSIMWalletAdmin", args: [] },
  { label: "registry._vault", run: (c) => registry._vault(c), address: F.REGISTRY, functionName: "vault", args: [] },
  { label: "registry._upgradeManager", run: (c) => registry._upgradeManager(c), address: F.REGISTRY, functionName: "upgradeManager", args: [] },
  { label: "registry._lazyWalletRegistry", run: (c) => registry._lazyWalletRegistry(c), address: F.REGISTRY, functionName: "lazyWalletRegistry", args: [] },
  { label: "registry._uniqueIdentifierToDeviceWallet", run: (c) => registry._uniqueIdentifierToDeviceWallet(c, "Device_11"), address: F.REGISTRY, functionName: "uniqueIdentifierToDeviceWallet", args: ["Device_11"] },
  { label: "registry._deviceWalletToOwner", run: (c) => registry._deviceWalletToOwner(c, WALLET, 1n), address: F.REGISTRY, functionName: "deviceWalletToOwner", args: [WALLET, 1n] },
  { label: "registry._registeredP256Keys", run: (c) => registry._registeredP256Keys(c, HASH), address: F.REGISTRY, functionName: "registeredP256Keys", args: [HASH] },
  { label: "registry._isDeviceWalletValid", run: (c) => registry._isDeviceWalletValid(c, WALLET), address: F.REGISTRY, functionName: "isDeviceWalletValid", args: [WALLET] },
  { label: "registry._isESIMWalletValid", run: (c) => registry._isESIMWalletValid(c, ESIM), address: F.REGISTRY, functionName: "isESIMWalletValid", args: [ESIM] },
  { label: "registry._isESIMWalletOnStandby", run: (c) => registry._isESIMWalletOnStandby(c, ESIM), address: F.REGISTRY, functionName: "isESIMWalletOnStandby", args: [ESIM] },

  // lazyWalletRegistry.reads (target = LAZY_WALLET_REGISTRY)
  { label: "lazyWalletRegistry._upgradeManager", run: (c) => lazyWalletRegistry._upgradeManager(c), address: F.LAZY_WALLET_REGISTRY, functionName: "upgradeManager", args: [] },
  { label: "lazyWalletRegistry._eSIMIdentifierToDeviceIdentifier", run: (c) => lazyWalletRegistry._eSIMIdentifierToDeviceIdentifier(c, "eid-1"), address: F.LAZY_WALLET_REGISTRY, functionName: "eSIMIdentifierToDeviceIdentifier", args: ["eid-1"] },
  { label: "lazyWalletRegistry._eSIMIdentifiersAssociatedWithDeviceIdentifier", run: (c) => lazyWalletRegistry._eSIMIdentifiersAssociatedWithDeviceIdentifier(c, "Device_11", 0n), address: F.LAZY_WALLET_REGISTRY, functionName: "eSIMIdentifiersAssociatedWithDeviceIdentifier", args: ["Device_11", 0n] },

  // deviceWallet.reads (target = device wallet instance address)
  { label: "deviceWallet._deviceUniqueIdentifier", run: (c) => deviceWallet._deviceUniqueIdentifier(c, WALLET), address: WALLET, functionName: "deviceUniqueIdentifier", args: [] },
  { label: "deviceWallet._isValidESIMWallet", run: (c) => deviceWallet._isValidESIMWallet(c, WALLET, ESIM), address: WALLET, functionName: "isValidESIMWallet", args: [ESIM] },
  { label: "deviceWallet._canPullETH", run: (c) => deviceWallet._canPullETH(c, WALLET, ESIM), address: WALLET, functionName: "canPullETH", args: [ESIM] },
  { label: "deviceWallet._getVaultAddress", run: (c) => deviceWallet._getVaultAddress(c, WALLET), address: WALLET, functionName: "getVaultAddress", args: [] },

  // eSIMWallet.reads (target = eSIM instance address)
  { label: "eSIMWallet._eSIMWalletFactory", run: (c) => eSIMWallet._eSIMWalletFactory(c, ESIM), address: ESIM, functionName: "eSIMWalletFactory", args: [] },
  { label: "eSIMWallet._eSIMUniqueIdentifier", run: (c) => eSIMWallet._eSIMUniqueIdentifier(c, ESIM), address: ESIM, functionName: "eSIMUniqueIdentifier", args: [] },
  { label: "eSIMWallet._newRequestedOwner", run: (c) => eSIMWallet._newRequestedOwner(c, ESIM), address: ESIM, functionName: "newRequestedOwner", args: [] },
  { label: "eSIMWallet._owner", run: (c) => eSIMWallet._owner(c, ESIM), address: ESIM, functionName: "owner", args: [] },
];

describe("admin readContract calls", () => {
  it.each(readCases)("$label reads the expected address + calldata", async ({ run, address, functionName, args }) => {
    const client = makeMockWalletClient({ chainId: CHAIN_ID });
    await run(client);

    const read = client.readContract as ReturnType<typeof vi.fn>;
    expect(read).toHaveBeenCalledTimes(1);
    const arg = read.mock.calls[0][0];
    expect(arg.address).toBe(address);
    expect(arg.functionName).toBe(functionName);
    expect(arg.args).toEqual(args);
    // Reads never thread an account/value through - only the read shape matters.
    expect(arg.value).toBeUndefined();
  });

  it("deviceIdentifierToESIMDetails maps the (id, price) tuple into a DataBundleDetails", async () => {
    const client = makeMockWalletClient({ chainId: CHAIN_ID, readResult: ["bundle-1", 1000n] });
    const details = await lazyWalletRegistry._deviceIdentifierToESIMDetails(client, "Device_11", "eid-1", 0n);

    const read = client.readContract as ReturnType<typeof vi.fn>;
    expect(read.mock.calls[0][0].functionName).toBe("deviceIdentifierToESIMDetails");
    expect(read.mock.calls[0][0].args).toEqual(["Device_11", "eid-1", 0n]);
    expect(details).toEqual({ dataBundleID: "bundle-1", dataBundlePrice: 1000n });
  });
});
