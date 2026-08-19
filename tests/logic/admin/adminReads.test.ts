import { describe, it, expect, vi } from "vitest";
import { type Address, type Hex } from "viem";

import { makeMockWalletClient } from "../../utils/mockClient.js";
import { baseSepoliaFactoryAddresses } from "../../../src/logic/constants.js";

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

const F = baseSepoliaFactoryAddresses;
const CHAIN_ID = 84532;

// Every admin read. Each row asserts the SDK issues a `readContract` (via the
// `publicActions`-extended client) against the expected address / functionName /
// args, matching the on-chain getter signature. Reads never require an account.
const readCases: Array<{
  label: string;
  run: (c: ReturnType<typeof makeMockWalletClient>) => Promise<unknown>;
  address: Address;
  functionName: string;
  args: readonly unknown[];
}> = [
  // deviceWalletFactory.reads (target = DEVICE_WALLET_FACTORY)
  { label: "deviceWalletFactory._proxiableUUID", run: (c) => deviceWalletFactory._proxiableUUID(c), address: F.DEVICE_WALLET_FACTORY, functionName: "proxiableUUID", args: [] },
  { label: "deviceWalletFactory._upgradeInterfaceVersion", run: (c) => deviceWalletFactory._upgradeInterfaceVersion(c), address: F.DEVICE_WALLET_FACTORY, functionName: "UPGRADE_INTERFACE_VERSION", args: [] },
  { label: "deviceWalletFactory._eSIMWalletAdmin", run: (c) => deviceWalletFactory._eSIMWalletAdmin(c), address: F.DEVICE_WALLET_FACTORY, functionName: "eSIMWalletAdmin", args: [] },
  { label: "deviceWalletFactory._deviceWalletInfoAdded", run: (c) => deviceWalletFactory._deviceWalletInfoAdded(c, WALLET), address: F.DEVICE_WALLET_FACTORY, functionName: "deviceWalletInfoAdded", args: [WALLET] },
  { label: "deviceWalletFactory._getCurrentDeviceWalletImplementation", run: (c) => deviceWalletFactory._getCurrentDeviceWalletImplementation(c), address: F.DEVICE_WALLET_FACTORY, functionName: "getCurrentDeviceWalletImplementation", args: [] },
  { label: "deviceWalletFactory._getCounterFactualAddress", run: (c) => deviceWalletFactory._getCounterFactualAddress(c, OWNER_KEY, "Device_11", 1n), address: F.DEVICE_WALLET_FACTORY, functionName: "getCounterFactualAddress", args: [OWNER_KEY, "Device_11", 1n] },
  // uid first here, unlike getCounterFactualAddress, which takes the key first.
  { label: "deviceWalletFactory._preCreateAccountValidation", run: (c) => deviceWalletFactory._preCreateAccountValidation(c, "Device_11", OWNER_KEY), address: F.DEVICE_WALLET_FACTORY, functionName: "preCreateAccountValidation", args: ["Device_11", OWNER_KEY] },
  { label: "deviceWalletFactory._beacon", run: (c) => deviceWalletFactory._beacon(c), address: F.DEVICE_WALLET_FACTORY, functionName: "beacon", args: [] },
  { label: "deviceWalletFactory._registry", run: (c) => deviceWalletFactory._registry(c), address: F.DEVICE_WALLET_FACTORY, functionName: "registry", args: [] },
  { label: "deviceWalletFactory._entryPoint", run: (c) => deviceWalletFactory._entryPoint(c), address: F.DEVICE_WALLET_FACTORY, functionName: "entryPoint", args: [] },
  { label: "deviceWalletFactory._verifier", run: (c) => deviceWalletFactory._verifier(c), address: F.DEVICE_WALLET_FACTORY, functionName: "verifier", args: [] },
  { label: "deviceWalletFactory._owner", run: (c) => deviceWalletFactory._owner(c), address: F.DEVICE_WALLET_FACTORY, functionName: "owner", args: [] },
  { label: "deviceWalletFactory._pendingOwner", run: (c) => deviceWalletFactory._pendingOwner(c), address: F.DEVICE_WALLET_FACTORY, functionName: "pendingOwner", args: [] },

  // eSIMWalletFactory.reads (target = ESIM_WALLET_FACTORY)
  { label: "eSIMWalletFactory._owner", run: (c) => eSIMWalletFactory._owner(c), address: F.ESIM_WALLET_FACTORY, functionName: "owner", args: [] },
  { label: "eSIMWalletFactory._pendingOwner", run: (c) => eSIMWalletFactory._pendingOwner(c), address: F.ESIM_WALLET_FACTORY, functionName: "pendingOwner", args: [] },
  { label: "eSIMWalletFactory._proxiableUUID", run: (c) => eSIMWalletFactory._proxiableUUID(c), address: F.ESIM_WALLET_FACTORY, functionName: "proxiableUUID", args: [] },
  { label: "eSIMWalletFactory._upgradeInterfaceVersion", run: (c) => eSIMWalletFactory._upgradeInterfaceVersion(c), address: F.ESIM_WALLET_FACTORY, functionName: "UPGRADE_INTERFACE_VERSION", args: [] },
  { label: "eSIMWalletFactory._isESIMWalletDeployed", run: (c) => eSIMWalletFactory._isESIMWalletDeployed(c, ESIM), address: F.ESIM_WALLET_FACTORY, functionName: "isESIMWalletDeployed", args: [ESIM] },
  { label: "eSIMWalletFactory._getCurrentESIMWalletImplementation", run: (c) => eSIMWalletFactory._getCurrentESIMWalletImplementation(c), address: F.ESIM_WALLET_FACTORY, functionName: "getCurrentESIMWalletImplementation", args: [] },

  // registry.reads (target = REGISTRY)
  { label: "registry._eSIMWalletAdmin", run: (c) => registry._eSIMWalletAdmin(c), address: F.REGISTRY, functionName: "eSIMWalletAdmin", args: [] },
  { label: "registry._proxiableUUID", run: (c) => registry._proxiableUUID(c), address: F.REGISTRY, functionName: "proxiableUUID", args: [] },
  { label: "registry._upgradeInterfaceVersion", run: (c) => registry._upgradeInterfaceVersion(c), address: F.REGISTRY, functionName: "UPGRADE_INTERFACE_VERSION", args: [] },
  { label: "registry._adminOfRecord", run: (c) => registry._adminOfRecord(c), address: F.REGISTRY, functionName: "adminOfRecord", args: [] },
  { label: "registry._adminDisabled", run: (c) => registry._adminDisabled(c), address: F.REGISTRY, functionName: "adminDisabled", args: [] },
  { label: "registry._newRequestedAdmin", run: (c) => registry._newRequestedAdmin(c), address: F.REGISTRY, functionName: "newRequestedAdmin", args: [] },
  { label: "registry._vault", run: (c) => registry._vault(c), address: F.REGISTRY, functionName: "vault", args: [] },
  { label: "registry._upgradeManager", run: (c) => registry._upgradeManager(c), address: F.REGISTRY, functionName: "upgradeManager", args: [] },
  { label: "registry._lazyWalletRegistry", run: (c) => registry._lazyWalletRegistry(c), address: F.REGISTRY, functionName: "lazyWalletRegistry", args: [] },
  { label: "registry._uniqueIdentifierToDeviceWallet", run: (c) => registry._uniqueIdentifierToDeviceWallet(c, "Device_11"), address: F.REGISTRY, functionName: "uniqueIdentifierToDeviceWallet", args: ["Device_11"] },
  { label: "registry._deviceWalletToOwner", run: (c) => registry._deviceWalletToOwner(c, WALLET, 1n), address: F.REGISTRY, functionName: "deviceWalletToOwner", args: [WALLET, 1n] },
  { label: "registry._registeredP256Keys", run: (c) => registry._registeredP256Keys(c, HASH), address: F.REGISTRY, functionName: "registeredP256Keys", args: [HASH] },
  { label: "registry._isDeviceWalletValid", run: (c) => registry._isDeviceWalletValid(c, WALLET), address: F.REGISTRY, functionName: "isDeviceWalletValid", args: [WALLET] },
  { label: "registry._isESIMWalletValid", run: (c) => registry._isESIMWalletValid(c, ESIM), address: F.REGISTRY, functionName: "isESIMWalletValid", args: [ESIM] },
  { label: "registry._isESIMWalletOnStandby", run: (c) => registry._isESIMWalletOnStandby(c, ESIM), address: F.REGISTRY, functionName: "isESIMWalletOnStandby", args: [ESIM] },
  { label: "registry._paused", run: (c) => registry._paused(c), address: F.REGISTRY, functionName: "paused", args: [] },
  { label: "registry._defaultDataBundlePriceCap", run: (c) => registry._defaultDataBundlePriceCap(c), address: F.REGISTRY, functionName: "defaultDataBundlePriceCap", args: [] },
  { label: "registry._isDeviceIdentifierAlreadyUsed", run: (c) => registry._isDeviceIdentifierAlreadyUsed(c, "Device_11"), address: F.REGISTRY, functionName: "isDeviceIdentifierAlreadyUsed", args: ["Device_11"] },
  { label: "registry._isESIMIdentifierClaimed", run: (c) => registry._isESIMIdentifierClaimed(c, "eSIM_11"), address: F.REGISTRY, functionName: "isESIMIdentifierClaimed", args: ["eSIM_11"] },
  { label: "registry._eSIMWalletForIdentifier", run: (c) => registry._eSIMWalletForIdentifier(c, "eSIM_11"), address: F.REGISTRY, functionName: "eSIMWalletForIdentifier", args: ["eSIM_11"] },
  { label: "registry._claimedESIMIdentifiers", run: (c) => registry._claimedESIMIdentifiers(c, HASH), address: F.REGISTRY, functionName: "claimedESIMIdentifiers", args: [HASH] },
  { label: "registry._requireDeviceIdentifierNotReserved", run: (c) => registry._requireDeviceIdentifierNotReserved(c, "Device_11"), address: F.REGISTRY, functionName: "requireDeviceIdentifierNotReserved", args: ["Device_11"] },
  { label: "registry._requireNotPaused", run: (c) => registry._requireNotPaused(c), address: F.REGISTRY, functionName: "requireNotPaused", args: [] },
  { label: "registry._pendingOwner", run: (c) => registry._pendingOwner(c), address: F.REGISTRY, functionName: "pendingOwner", args: [] },
  { label: "registry._deviceWalletFactory", run: (c) => registry._deviceWalletFactory(c), address: F.REGISTRY, functionName: "deviceWalletFactory", args: [] },
  { label: "registry._eSIMWalletFactory", run: (c) => registry._eSIMWalletFactory(c), address: F.REGISTRY, functionName: "eSIMWalletFactory", args: [] },
  { label: "registry._entryPoint", run: (c) => registry._entryPoint(c), address: F.REGISTRY, functionName: "entryPoint", args: [] },

  // lazyWalletRegistry.reads (target = LAZY_WALLET_REGISTRY)
  { label: "lazyWalletRegistry._owner", run: (c) => lazyWalletRegistry._owner(c), address: F.LAZY_WALLET_REGISTRY, functionName: "owner", args: [] },
  { label: "lazyWalletRegistry._pendingOwner", run: (c) => lazyWalletRegistry._pendingOwner(c), address: F.LAZY_WALLET_REGISTRY, functionName: "pendingOwner", args: [] },
  { label: "lazyWalletRegistry._proxiableUUID", run: (c) => lazyWalletRegistry._proxiableUUID(c), address: F.LAZY_WALLET_REGISTRY, functionName: "proxiableUUID", args: [] },
  { label: "lazyWalletRegistry._upgradeInterfaceVersion", run: (c) => lazyWalletRegistry._upgradeInterfaceVersion(c), address: F.LAZY_WALLET_REGISTRY, functionName: "UPGRADE_INTERFACE_VERSION", args: [] },
  { label: "lazyWalletRegistry._upgradeManager", run: (c) => lazyWalletRegistry._upgradeManager(c), address: F.LAZY_WALLET_REGISTRY, functionName: "upgradeManager", args: [] },
  { label: "lazyWalletRegistry._eSIMIdentifierToDeviceIdentifier", run: (c) => lazyWalletRegistry._eSIMIdentifierToDeviceIdentifier(c, "eid-1"), address: F.LAZY_WALLET_REGISTRY, functionName: "eSIMIdentifierToDeviceIdentifier", args: ["eid-1"] },
  { label: "lazyWalletRegistry._eSIMIdentifiersAssociatedWithDeviceIdentifier", run: (c) => lazyWalletRegistry._eSIMIdentifiersAssociatedWithDeviceIdentifier(c, "Device_11", 0n), address: F.LAZY_WALLET_REGISTRY, functionName: "eSIMIdentifiersAssociatedWithDeviceIdentifier", args: ["Device_11", 0n] },
  { label: "lazyWalletRegistry._maxESIMWalletsPerCall", run: (c) => lazyWalletRegistry._maxESIMWalletsPerCall(c), address: F.LAZY_WALLET_REGISTRY, functionName: "MAX_ESIM_WALLETS_PER_CALL", args: [] },
  { label: "lazyWalletRegistry._maxHistoryEntriesPerCall", run: (c) => lazyWalletRegistry._maxHistoryEntriesPerCall(c), address: F.LAZY_WALLET_REGISTRY, functionName: "MAX_HISTORY_ENTRIES_PER_CALL", args: [] },
  { label: "lazyWalletRegistry._eSIMWalletsDeployed", run: (c) => lazyWalletRegistry._eSIMWalletsDeployed(c, "Device_11"), address: F.LAZY_WALLET_REGISTRY, functionName: "eSIMWalletsDeployed", args: ["Device_11"] },
  { label: "lazyWalletRegistry._lazyDeploymentSalt", run: (c) => lazyWalletRegistry._lazyDeploymentSalt(c, "Device_11"), address: F.LAZY_WALLET_REGISTRY, functionName: "lazyDeploymentSalt", args: ["Device_11"] },
  { label: "lazyWalletRegistry._lazyDeployedESIMWallet", run: (c) => lazyWalletRegistry._lazyDeployedESIMWallet(c, "eid-1"), address: F.LAZY_WALLET_REGISTRY, functionName: "lazyDeployedESIMWallet", args: ["eid-1"] },
  { label: "lazyWalletRegistry._historyEntriesCopied", run: (c) => lazyWalletRegistry._historyEntriesCopied(c, "eid-1"), address: F.LAZY_WALLET_REGISTRY, functionName: "historyEntriesCopied", args: ["eid-1"] },
  { label: "lazyWalletRegistry._isDeviceIdentifierReserved", run: (c) => lazyWalletRegistry._isDeviceIdentifierReserved(c, "Device_11"), address: F.LAZY_WALLET_REGISTRY, functionName: "isDeviceIdentifierReserved", args: ["Device_11"] },
  { label: "lazyWalletRegistry._isESIMIdentifierReserved", run: (c) => lazyWalletRegistry._isESIMIdentifierReserved(c, "eid-1"), address: F.LAZY_WALLET_REGISTRY, functionName: "isESIMIdentifierReserved", args: ["eid-1"] },

  // deviceWallet.reads (target = device wallet instance address)
  { label: "deviceWallet._deviceUniqueIdentifier", run: (c) => deviceWallet._deviceUniqueIdentifier(c, WALLET), address: WALLET, functionName: "deviceUniqueIdentifier", args: [] },
  { label: "deviceWallet._isValidESIMWallet", run: (c) => deviceWallet._isValidESIMWallet(c, WALLET, ESIM), address: WALLET, functionName: "isValidESIMWallet", args: [ESIM] },
  { label: "deviceWallet._canPullETH", run: (c) => deviceWallet._canPullETH(c, WALLET, ESIM), address: WALLET, functionName: "canPullETH", args: [ESIM] },
  { label: "deviceWallet._getVaultAddress", run: (c) => deviceWallet._getVaultAddress(c, WALLET), address: WALLET, functionName: "getVaultAddress", args: [] },
  { label: "deviceWallet._getDeposit", run: (c) => deviceWallet._getDeposit(c, WALLET), address: WALLET, functionName: "getDeposit", args: [] },
  { label: "deviceWallet._isValidSignature", run: (c) => deviceWallet._isValidSignature(c, WALLET, HASH, "0x01000000000000dead"), address: WALLET, functionName: "isValidSignature", args: [HASH, "0x01000000000000dead"] },
  { label: "deviceWallet._registry", run: (c) => deviceWallet._registry(c, WALLET), address: WALLET, functionName: "registry", args: [] },
  { label: "deviceWallet._eSIMWalletFactory", run: (c) => deviceWallet._eSIMWalletFactory(c, WALLET), address: WALLET, functionName: "eSIMWalletFactory", args: [] },
  { label: "deviceWallet._entryPoint", run: (c) => deviceWallet._entryPoint(c, WALLET), address: WALLET, functionName: "entryPoint", args: [] },
  { label: "deviceWallet._verifier", run: (c) => deviceWallet._verifier(c, WALLET), address: WALLET, functionName: "verifier", args: [] },

  // eSIMWallet.reads (target = eSIM instance address)
  { label: "eSIMWallet._eSIMWalletFactory", run: (c) => eSIMWallet._eSIMWalletFactory(c, ESIM), address: ESIM, functionName: "eSIMWalletFactory", args: [] },
  { label: "eSIMWallet._eSIMUniqueIdentifier", run: (c) => eSIMWallet._eSIMUniqueIdentifier(c, ESIM), address: ESIM, functionName: "eSIMUniqueIdentifier", args: [] },
  { label: "eSIMWallet._newRequestedOwner", run: (c) => eSIMWallet._newRequestedOwner(c, ESIM), address: ESIM, functionName: "newRequestedOwner", args: [] },
  { label: "eSIMWallet._owner", run: (c) => eSIMWallet._owner(c, ESIM), address: ESIM, functionName: "owner", args: [] },
  { label: "eSIMWallet._dataBundlePriceCap", run: (c) => eSIMWallet._dataBundlePriceCap(c, ESIM), address: ESIM, functionName: "dataBundlePriceCap", args: [] },
  { label: "eSIMWallet._deviceWallet", run: (c) => eSIMWallet._deviceWallet(c, ESIM), address: ESIM, functionName: "deviceWallet", args: [] },
  { label: "eSIMWallet._transactionHistory", run: (c) => eSIMWallet._transactionHistory(c, ESIM, 2n), address: ESIM, functionName: "transactionHistory", args: [2n] },
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

  // The owner key is stored as an array, so Solidity gives an indexed getter and
  // reading the pair takes two calls rather than one.
  it("getOwner reads both co-ordinates of the P256 key", async () => {
    const client = makeMockWalletClient({ chainId: CHAIN_ID, readResult: HASH });

    const owner = await deviceWallet._getOwner(client, WALLET);

    const read = client.readContract as ReturnType<typeof vi.fn>;
    expect(read).toHaveBeenCalledTimes(2);
    expect(read.mock.calls[0][0].functionName).toBe("owner");
    expect(read.mock.calls[0][0].args).toEqual([0n]);
    expect(read.mock.calls[1][0].args).toEqual([1n]);
    expect(owner).toEqual([HASH, HASH]);
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
