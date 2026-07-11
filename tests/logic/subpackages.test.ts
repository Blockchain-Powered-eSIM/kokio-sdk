import { describe, it, expect, beforeEach, vi } from "vitest";
import { encodeFunctionData, type Address, type Hex } from "viem";

import { makeMockSmartAccountClient } from "../utils/mockClient.js";
import { sepoliaFactoryAddresses } from "../../src/logic/constants.js";
import {
  DeviceWallet,
  DeviceWalletFactory,
  ESIMWallet,
  ESIMWalletFactory,
  LazyWalletRegistry,
  P256Verifier,
} from "../../src/abis/index.js";
import type { DataBundleDetails, WebAuthnSignature } from "../../src/types.js";

import * as deviceWallet from "../../src/logic/deviceWallet.js";
import * as deviceWalletFactory from "../../src/logic/deviceWalletFactory.js";
import * as eSIMWallet from "../../src/logic/eSIMWallet.js";
import * as eSIMWalletFactory from "../../src/logic/eSIMWalletFactory.js";
import * as lazyWalletRegistry from "../../src/logic/lazyWalletRegistry.js";
import * as p256Verifier from "../../src/logic/P256Verifier.js";

// --- Fixtures ---------------------------------------------------------------
const WALLET = "0x00000000000000000000000000000000000dead1" as Address;
const ESIM = "0x00000000000000000000000000000000000e51a1" as Address;
const NEW_OWNER = "0x0000000000000000000000000000000000ce7701" as Address;
const REGISTRY = "0x000000000000000000000000000000000009e915" as Address;
const OWNER_KEY: [Hex, Hex] = [
  "0x6B17D1F2E12C4247F8BCE6E563A440F277037D812DEB33A0F4A13945D898C291",
  "0x4FE342E2FE1A7F9B8EE7EB4A7C0F9E162BCE33576B315ECECBB6406837BF51F1",
];
const BUNDLE: DataBundleDetails = {
  dataBundleID: "bundle-1",
  dataBundlePrice: 1000n,
};
const WEBAUTHN_SIG: WebAuthnSignature = {
  authenticatorData: "0x1122",
  clientDataJSON: '{"type":"webauthn.get","challenge":"abc"}',
  challengeIndex: 23n,
  typeIndex: 1n,
  r: 1n,
  s: 2n,
};

const F = sepoliaFactoryAddresses;

/**
 * Every UserOp-producing sub-package call that currently encodes cleanly.
 * Each row asserts the SDK sends `{ target, data }` matching an independent
 * encodeFunctionData of the expected (abi, functionName, args).
 */
const userOpCases: Array<{
  label: string;
  run: (c: ReturnType<typeof makeMockSmartAccountClient>) => Promise<unknown>;
  target: Address;
  data: Hex;
}> = [
  // deviceWallet.ts (target = wallet address arg)
  {
    label: "deviceWallet._deployESIMWallet",
    run: (c) => deviceWallet._deployESIMWallet(c, WALLET, true, 7n),
    target: WALLET,
    data: encodeFunctionData({ abi: DeviceWallet, functionName: "deployESIMWallet", args: [true, 7n] }),
  },
  {
    label: "deviceWallet._setESIMUniqueIdentifierForAnESIMWallet",
    run: (c) => deviceWallet._setESIMUniqueIdentifierForAnESIMWallet(c, WALLET, ESIM, "eid-1"),
    target: WALLET,
    data: encodeFunctionData({ abi: DeviceWallet, functionName: "setESIMUniqueIdentifierForAnESIMWallet", args: [ESIM, "eid-1"] }),
  },
  {
    label: "deviceWallet._payETHForDataBundles",
    run: (c) => deviceWallet._payETHForDataBundles(c, WALLET, 5n),
    target: WALLET,
    data: encodeFunctionData({ abi: DeviceWallet, functionName: "payETHForDataBundles", args: [5n] }),
  },
  {
    label: "deviceWallet._pullETH",
    run: (c) => deviceWallet._pullETH(c, WALLET, 9n),
    target: WALLET,
    data: encodeFunctionData({ abi: DeviceWallet, functionName: "pullETH", args: [9n] }),
  },
  {
    label: "deviceWallet._getVaultAddress",
    run: (c) => deviceWallet._getVaultAddress(c, WALLET),
    target: WALLET,
    data: encodeFunctionData({ abi: DeviceWallet, functionName: "getVaultAddress", args: [] }),
  },
  {
    label: "deviceWallet._toggleAccessToETH",
    run: (c) => deviceWallet._toggleAccessToETH(c, WALLET, ESIM, true),
    target: WALLET,
    data: encodeFunctionData({ abi: DeviceWallet, functionName: "toggleAccessToETH", args: [ESIM, true] }),
  },
  {
    label: "deviceWallet._addESIMWallet",
    run: (c) => deviceWallet._addESIMWallet(c, WALLET, ESIM, true),
    target: WALLET,
    data: encodeFunctionData({ abi: DeviceWallet, functionName: "addESIMWallet", args: [ESIM, true] }),
  },
  {
    label: "deviceWallet._removeESIMWallet",
    run: (c) => deviceWallet._removeESIMWallet(c, WALLET, ESIM, false),
    target: WALLET,
    data: encodeFunctionData({ abi: DeviceWallet, functionName: "removeESIMWallet", args: [ESIM, false] }),
  },
  // eSIMWallet.ts (target = eSIM address arg)
  {
    label: "eSIMWallet._setESIMUniqueIdentifier",
    run: (c) => eSIMWallet._setESIMUniqueIdentifier(c, ESIM, "eid-9"),
    target: ESIM,
    data: encodeFunctionData({ abi: ESIMWallet, functionName: "setESIMUniqueIdentifier", args: ["eid-9"] }),
  },
  {
    label: "eSIMWallet._populateHistory",
    run: (c) => eSIMWallet._populateHistory(c, ESIM, [BUNDLE]),
    target: ESIM,
    data: encodeFunctionData({ abi: ESIMWallet, functionName: "populateHistory", args: [[BUNDLE]] }),
  },
  {
    label: "eSIMWallet._owner",
    run: (c) => eSIMWallet._owner(c, ESIM),
    target: ESIM,
    data: encodeFunctionData({ abi: ESIMWallet, functionName: "owner", args: [] }),
  },
  {
    label: "eSIMWallet._requestTransferOwnership",
    run: (c) => eSIMWallet._requestTransferOwnership(c, ESIM, NEW_OWNER),
    target: ESIM,
    data: encodeFunctionData({ abi: ESIMWallet, functionName: "requestTransferOwnership", args: [NEW_OWNER] }),
  },
  {
    label: "eSIMWallet._acceptOwnershipTransfer",
    run: (c) => eSIMWallet._acceptOwnershipTransfer(c, ESIM),
    target: ESIM,
    data: encodeFunctionData({ abi: ESIMWallet, functionName: "acceptOwnershipTransfer", args: [] }),
  },
  {
    label: "eSIMWallet._sendETHToDeviceWallet",
    run: (c) => eSIMWallet._sendETHToDeviceWallet(c, ESIM, 3n),
    target: ESIM,
    data: encodeFunctionData({ abi: ESIMWallet, functionName: "sendETHToDeviceWallet", args: [3n] }),
  },
  {
    // Phase 2 fix: ESIMWallet ABI exposes buyDataBundle (not payETHForDataBundles).
    label: "eSIMWallet._buyDataBundle",
    run: (c) => eSIMWallet._buyDataBundle(c, ESIM, BUNDLE),
    target: ESIM,
    data: encodeFunctionData({ abi: ESIMWallet, functionName: "buyDataBundle", args: [BUNDLE] }),
  },
  {
    // Phase 2 fix: transferOwnership takes an address, not an amount.
    label: "eSIMWallet._transferOwnership",
    run: (c) => eSIMWallet._transferOwnership(c, ESIM, NEW_OWNER),
    target: ESIM,
    data: encodeFunctionData({ abi: ESIMWallet, functionName: "transferOwnership", args: [NEW_OWNER] }),
  },
  // deviceWalletFactory.ts (target = DEVICE_WALLET_FACTORY)
  {
    // Phase 2 fix: on-chain view is getCounterFactualAddress(ownerKey, uid, salt).
    label: "deviceWalletFactory._getAddress",
    run: (c) => deviceWalletFactory._getAddress(c, "Device_11", OWNER_KEY, 1n),
    target: F.DEVICE_WALLET_FACTORY,
    data: encodeFunctionData({ abi: DeviceWalletFactory, functionName: "getCounterFactualAddress", args: [OWNER_KEY, "Device_11", 1n] }),
  },
  {
    label: "deviceWalletFactory._getCurrentDeviceWalletImplementation",
    run: (c) => deviceWalletFactory._getCurrentDeviceWalletImplementation(c),
    target: F.DEVICE_WALLET_FACTORY,
    data: encodeFunctionData({ abi: DeviceWalletFactory, functionName: "getCurrentDeviceWalletImplementation", args: [] }),
  },
  // eSIMWalletFactory.ts (target = ESIM_WALLET_FACTORY)
  {
    label: "eSIMWalletFactory._addRegistryAddress",
    run: (c) => eSIMWalletFactory._addRegistryAddress(c, REGISTRY),
    target: F.ESIM_WALLET_FACTORY,
    data: encodeFunctionData({ abi: ESIMWalletFactory, functionName: "addRegistryAddress", args: [REGISTRY] }),
  },
  {
    label: "eSIMWalletFactory._deployESIMWalletWithUserOp",
    run: (c) => eSIMWalletFactory._deployESIMWalletWithUserOp(c, WALLET, 1n),
    target: F.ESIM_WALLET_FACTORY,
    data: encodeFunctionData({ abi: ESIMWalletFactory, functionName: "deployESIMWallet", args: [WALLET, 1n] }),
  },
  {
    label: "eSIMWalletFactory._getCurrentESIMWalletImplementation",
    run: (c) => eSIMWalletFactory._getCurrentESIMWalletImplementation(c),
    target: F.ESIM_WALLET_FACTORY,
    data: encodeFunctionData({ abi: ESIMWalletFactory, functionName: "getCurrentESIMWalletImplementation", args: [] }),
  },
  // lazyWalletRegistry.ts (target = LAZY_WALLET_REGISTRY)
  {
    label: "lazyWalletRegistry._isLazyWalletDeployed",
    run: (c) => lazyWalletRegistry._isLazyWalletDeployed(c, "Device_11"),
    target: F.LAZY_WALLET_REGISTRY,
    data: encodeFunctionData({ abi: LazyWalletRegistry, functionName: "isLazyWalletDeployed", args: ["Device_11"] }),
  },
  {
    label: "lazyWalletRegistry._batchPopulateHistory",
    run: (c) => lazyWalletRegistry._batchPopulateHistory(c, ["Device_11"], [["eid-1"]], [[BUNDLE]]),
    target: F.LAZY_WALLET_REGISTRY,
    data: encodeFunctionData({ abi: LazyWalletRegistry, functionName: "batchPopulateHistory", args: [["Device_11"], [["eid-1"]], [[BUNDLE]]] }),
  },
  {
    label: "lazyWalletRegistry._deployLazyWalletAndSetESIMIdentifier",
    run: (c) => lazyWalletRegistry._deployLazyWalletAndSetESIMIdentifier(c, OWNER_KEY, "Device_11", 1n, 2n),
    target: F.LAZY_WALLET_REGISTRY,
    data: encodeFunctionData({ abi: LazyWalletRegistry, functionName: "deployLazyWalletAndSetESIMIdentifier", args: [OWNER_KEY, "Device_11", 1n, 2n] }),
  },
  {
    label: "lazyWalletRegistry._switchESIMIdentifierToNewDeviceIdentifier",
    run: (c) => lazyWalletRegistry._switchESIMIdentifierToNewDeviceIdentifier(c, "eid-1", "old", "new"),
    target: F.LAZY_WALLET_REGISTRY,
    data: encodeFunctionData({ abi: LazyWalletRegistry, functionName: "switchESIMIdentifierToNewDeviceIdentifier", args: ["eid-1", "old", "new"] }),
  },
  // P256Verifier.ts (target = P256VERIFIER); message is `bytes` -> pass hex
  {
    label: "p256Verifier._verifySignature",
    run: (c) => p256Verifier._verifySignature(c, "0x1234", true, WEBAUTHN_SIG, 10n, 20n),
    target: F.P256VERIFIER,
    data: encodeFunctionData({ abi: P256Verifier, functionName: "verifySignature", args: ["0x1234", true, WEBAUTHN_SIG, 10n, 20n] }),
  },
];

describe("sub-package UserOp calldata", () => {
  it.each(userOpCases)("$label sends the expected target + calldata", async ({ run, target, data }) => {
    const client = makeMockSmartAccountClient();
    await run(client);

    const send = client.sendUserOperation as ReturnType<typeof vi.fn>;
    expect(send).toHaveBeenCalledTimes(1);
    const arg = send.mock.calls[0][0];
    expect(arg.account).toBe(client.account);
    expect(arg.uo.target).toBe(target);
    expect(arg.uo.data).toBe(data);
  });

  it.each(userOpCases)("$label throws MISSING_SMART_WALLET without an account", async ({ run }) => {
    const client = makeMockSmartAccountClient({ withAccount: false });
    await expect(run(client)).rejects.toThrow(/smart wallet/i);
  });
});

// --- EOA writeContract paths ------------------------------------------------
describe("EOA writeContract paths", () => {
  it("deviceWalletFactory._createAccountWithEOA calls writeContract on the factory", async () => {
    const { makeMockWalletClient } = await import("../utils/mockClient.js");
    const client = makeMockWalletClient({ chainId: 11155111, account: "0x00000000000000000000000000000000000e0a01" });

    await deviceWalletFactory._createAccountWithEOA(client, "Device_11", OWNER_KEY, 1n, 100n);

    const write = client.writeContract as ReturnType<typeof vi.fn>;
    expect(write).toHaveBeenCalledTimes(1);
    const arg = write.mock.calls[0][0];
    expect(arg.address).toBe(F.DEVICE_WALLET_FACTORY);
    expect(arg.functionName).toBe("createAccount");
    // createAccount is payable: 3 positional args + the deposit as msg.value.
    expect(arg.args).toEqual(["Device_11", OWNER_KEY, 1n]);
    expect(arg.value).toBe(100n);
  });

  it("eSIMWalletFactory._deployESIMWalletWithEOA calls writeContract on the factory", async () => {
    const { makeMockWalletClient } = await import("../utils/mockClient.js");
    const client = makeMockWalletClient({ chainId: 11155111, account: "0x00000000000000000000000000000000000e0a01" });

    await eSIMWalletFactory._deployESIMWalletWithEOA(client, WALLET, 2n);

    const write = client.writeContract as ReturnType<typeof vi.fn>;
    const arg = write.mock.calls[0][0];
    expect(arg.address).toBe(F.ESIM_WALLET_FACTORY);
    expect(arg.functionName).toBe("deployESIMWallet");
    expect(arg.args).toEqual([WALLET, 2n]);
  });

  it("_createAccountWithEOA throws MISSING_EOA_WALLET without an account", async () => {
    const { makeMockWalletClient } = await import("../utils/mockClient.js");
    const client = makeMockWalletClient({ chainId: 11155111 });
    await expect(
      deviceWalletFactory._createAccountWithEOA(client, "Device_11", OWNER_KEY, 1n, 100n),
    ).rejects.toThrow(/EOA/i);
  });
});

// --- Read path (_getOwner) --------------------------------------------------
describe("deviceWallet._getOwner", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("reads owner[0] and owner[1] and returns the P256 key pair", async () => {
    vi.doMock("viem", async (importOriginal) => {
      const actual = await importOriginal<typeof import("viem")>();
      return {
        ...actual,
        getContract: vi.fn(() => ({
          read: {
            owner: async ([i]: [bigint]) => (i === 0n ? OWNER_KEY[0] : OWNER_KEY[1]),
          },
        })),
      };
    });
    const { _getOwner } = await import("../../src/logic/deviceWallet.js");
    const { makeMockWalletClient } = await import("../utils/mockClient.js");
    const client = makeMockWalletClient({ chainId: 11155111 });

    const owner = await _getOwner(client, WALLET);
    expect(owner).toEqual(OWNER_KEY);
    vi.doUnmock("viem");
  });
});
