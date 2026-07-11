import { describe, it, expect, vi } from "vitest";
import { type Address, type Hex } from "viem";

import { makeMockWalletClient } from "../../utils/mockClient.js";
import { sepoliaFactoryAddresses } from "../../../src/logic/constants.js";
import type { DataBundleDetails } from "../../../src/types.js";

import * as deviceWalletFactory from "../../../src/logic/admin/deviceWalletFactory.eoa.js";
import * as eSIMWalletFactory from "../../../src/logic/admin/eSIMWalletFactory.eoa.js";
import * as registry from "../../../src/logic/admin/registry.eoa.js";
import * as lazyWalletRegistry from "../../../src/logic/admin/lazyWalletRegistry.eoa.js";
import * as deviceWallet from "../../../src/logic/admin/deviceWallet.eoa.js";
import * as eSIMWallet from "../../../src/logic/admin/eSIMWallet.eoa.js";

// --- Fixtures ---------------------------------------------------------------
const EOA = "0x00000000000000000000000000000000000e0a01" as Address;
const WALLET = "0x00000000000000000000000000000000000dead1" as Address;
const ESIM = "0x00000000000000000000000000000000000e51a1" as Address;
const REGISTRY = "0x000000000000000000000000000000000009e915" as Address;
const LAZY = "0x0000000000000000000000000000000000001a2f" as Address;
const VAULT = "0x000000000000000000000000000000000000ada1" as Address;
const NEW_ADMIN = "0x000000000000000000000000000000000000ad11" as Address;
const IMPL = "0x0000000000000000000000000000000000009e11" as Address;
const OWNER_KEY: [Hex, Hex] = [
  "0x6B17D1F2E12C4247F8BCE6E563A440F277037D812DEB33A0F4A13945D898C291",
  "0x4FE342E2FE1A7F9B8EE7EB4A7C0F9E162BCE33576B315ECECBB6406837BF51F1",
];
const BUNDLE: DataBundleDetails = { dataBundleID: "bundle-1", dataBundlePrice: 1000n };

const F = sepoliaFactoryAddresses;
const CHAIN_ID = 11155111;

/**
 * Every admin-EOA logic call. Each row asserts the SDK issues a `writeContract`
 * with the expected address / functionName / args (and `value` for payable
 * calls), matching the on-chain signature. `value: undefined` documents the
 * non-payable calls where viem is passed no msg.value.
 */
const eoaCases: Array<{
  label: string;
  run: (c: ReturnType<typeof makeMockWalletClient>) => Promise<unknown>;
  address: Address;
  functionName: string;
  args: readonly unknown[];
  value?: bigint;
}> = [
  // deviceWalletFactory.eoa (target = DEVICE_WALLET_FACTORY)
  {
    label: "deviceWalletFactory._deployDeviceWalletForUsers",
    run: (c) => deviceWalletFactory._deployDeviceWalletForUsers(c, ["Device_11"], [OWNER_KEY], [1n], [2n], 2n),
    address: F.DEVICE_WALLET_FACTORY,
    functionName: "deployDeviceWalletForUsers",
    args: [["Device_11"], [OWNER_KEY], [1n], [2n]],
    value: 2n,
  },
  {
    label: "deviceWalletFactory._postCreateAccount",
    run: (c) => deviceWalletFactory._postCreateAccount(c, WALLET, "Device_11", OWNER_KEY),
    address: F.DEVICE_WALLET_FACTORY,
    functionName: "postCreateAccount",
    args: [WALLET, "Device_11", OWNER_KEY],
  },
  {
    label: "deviceWalletFactory._addRegistryAddress",
    run: (c) => deviceWalletFactory._addRegistryAddress(c, REGISTRY),
    address: F.DEVICE_WALLET_FACTORY,
    functionName: "addRegistryAddress",
    args: [REGISTRY],
  },
  {
    label: "deviceWalletFactory._updateVaultAddress",
    run: (c) => deviceWalletFactory._updateVaultAddress(c, VAULT),
    address: F.DEVICE_WALLET_FACTORY,
    functionName: "updateVaultAddress",
    args: [VAULT],
  },
  {
    label: "deviceWalletFactory._requestAdminUpdate",
    run: (c) => deviceWalletFactory._requestAdminUpdate(c, NEW_ADMIN),
    address: F.DEVICE_WALLET_FACTORY,
    functionName: "requestAdminUpdate",
    args: [NEW_ADMIN],
  },
  {
    label: "deviceWalletFactory._acceptAdminUpdate",
    run: (c) => deviceWalletFactory._acceptAdminUpdate(c),
    address: F.DEVICE_WALLET_FACTORY,
    functionName: "acceptAdminUpdate",
    args: [],
  },
  {
    label: "deviceWalletFactory._updateDeviceWalletImplementation",
    run: (c) => deviceWalletFactory._updateDeviceWalletImplementation(c, IMPL),
    address: F.DEVICE_WALLET_FACTORY,
    functionName: "updateDeviceWalletImplementation",
    args: [IMPL],
  },
  // eSIMWalletFactory.eoa (target = ESIM_WALLET_FACTORY)
  {
    label: "eSIMWalletFactory._addRegistryAddress",
    run: (c) => eSIMWalletFactory._addRegistryAddress(c, REGISTRY),
    address: F.ESIM_WALLET_FACTORY,
    functionName: "addRegistryAddress",
    args: [REGISTRY],
  },
  {
    label: "eSIMWalletFactory._updateESIMWalletImplementation",
    run: (c) => eSIMWalletFactory._updateESIMWalletImplementation(c, IMPL),
    address: F.ESIM_WALLET_FACTORY,
    functionName: "updateESIMWalletImplementation",
    args: [IMPL],
  },
  // registry.eoa (target = REGISTRY)
  {
    label: "registry._addOrUpdateLazyWalletRegistryAddress",
    run: (c) => registry._addOrUpdateLazyWalletRegistryAddress(c, LAZY),
    address: F.REGISTRY,
    functionName: "addOrUpdateLazyWalletRegistryAddress",
    args: [LAZY],
  },
  // lazyWalletRegistry.eoa (target = LAZY_WALLET_REGISTRY)
  {
    label: "lazyWalletRegistry._batchPopulateHistory",
    run: (c) => lazyWalletRegistry._batchPopulateHistory(c, ["Device_11"], [["eid-1"]], [[BUNDLE]]),
    address: F.LAZY_WALLET_REGISTRY,
    functionName: "batchPopulateHistory",
    args: [["Device_11"], [["eid-1"]], [[BUNDLE]]],
  },
  {
    // payable: contract requires depositAmount == msg.value, so value mirrors the arg.
    label: "lazyWalletRegistry._deployLazyWalletAndSetESIMIdentifier",
    run: (c) => lazyWalletRegistry._deployLazyWalletAndSetESIMIdentifier(c, OWNER_KEY, "Device_11", 1n, 2n),
    address: F.LAZY_WALLET_REGISTRY,
    functionName: "deployLazyWalletAndSetESIMIdentifier",
    args: [OWNER_KEY, "Device_11", 1n, 2n],
    value: 2n,
  },
  {
    label: "lazyWalletRegistry._switchESIMIdentifierToNewDeviceIdentifier",
    run: (c) => lazyWalletRegistry._switchESIMIdentifierToNewDeviceIdentifier(c, "eid-1", "old", "new"),
    address: F.LAZY_WALLET_REGISTRY,
    functionName: "switchESIMIdentifierToNewDeviceIdentifier",
    args: ["eid-1", "old", "new"],
  },
  // deviceWallet.eoa (target = device wallet instance address)
  {
    label: "deviceWallet._deployESIMWallet",
    run: (c) => deviceWallet._deployESIMWallet(c, WALLET, true, 7n),
    address: WALLET,
    functionName: "deployESIMWallet",
    args: [true, 7n],
  },
  {
    label: "deviceWallet._setESIMUniqueIdentifierForAnESIMWallet",
    run: (c) => deviceWallet._setESIMUniqueIdentifierForAnESIMWallet(c, WALLET, ESIM, "eid-1"),
    address: WALLET,
    functionName: "setESIMUniqueIdentifierForAnESIMWallet",
    args: [ESIM, "eid-1"],
  },
  // eSIMWallet.eoa (target = eSIM instance address)
  {
    label: "eSIMWallet._buyDataBundle (explicit value)",
    run: (c) => eSIMWallet._buyDataBundle(c, ESIM, BUNDLE, 500n),
    address: ESIM,
    functionName: "buyDataBundle",
    args: [BUNDLE],
    value: 500n,
  },
  {
    label: "eSIMWallet._buyDataBundle (default value 0)",
    run: (c) => eSIMWallet._buyDataBundle(c, ESIM, BUNDLE),
    address: ESIM,
    functionName: "buyDataBundle",
    args: [BUNDLE],
    value: 0n,
  },
];

describe("admin-EOA writeContract calls", () => {
  it.each(eoaCases)("$label writes the expected address + calldata", async ({ run, address, functionName, args, value }) => {
    const client = makeMockWalletClient({ chainId: CHAIN_ID, account: EOA });
    await run(client);

    const write = client.writeContract as ReturnType<typeof vi.fn>;
    expect(write).toHaveBeenCalledTimes(1);
    const arg = write.mock.calls[0][0];
    expect(arg.address).toBe(address);
    expect(arg.functionName).toBe(functionName);
    expect(arg.args).toEqual(args);
    expect(arg.value).toBe(value);
    // EOA account + resolved chain are always threaded through.
    expect(arg.account).toBe(EOA);
    expect(arg.chain).toBeDefined();
  });

  it.each(eoaCases)("$label throws MISSING_EOA_WALLET without an account", async ({ run }) => {
    const client = makeMockWalletClient({ chainId: CHAIN_ID });
    await expect(run(client)).rejects.toThrow(/EOA/i);
  });
});
