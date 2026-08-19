import { describe, it, expect, beforeEach, vi } from "vitest";
import { encodeFunctionData, type Address, type Hex } from "viem";

import { makeMockSmartAccountClient } from "../utils/mockClient.js";
import { baseSepoliaFactoryAddresses } from "../../src/logic/constants.js";
import {
  DeviceWallet,
  DeviceWalletFactory,
  ESIMWallet,
  ESIMWalletFactory,
  P256Verifier,
  Registry,
} from "../../src/abis/index.js";
import type { DataBundleDetails, WebAuthnSignature } from "../../src/types.js";

import * as deviceWallet from "../../src/logic/deviceWallet.js";
import * as deviceWalletFactory from "../../src/logic/deviceWalletFactory.js";
import * as eSIMWallet from "../../src/logic/eSIMWallet.js";
import * as eSIMWalletFactory from "../../src/logic/eSIMWalletFactory.js";
import * as registry from "../../src/logic/registry.js";
import * as p256Verifier from "../../src/logic/P256Verifier.js";

// --- Fixtures ---------------------------------------------------------------
const WALLET = "0x00000000000000000000000000000000000dead1" as Address;
const ESIM = "0x00000000000000000000000000000000000e51a1" as Address;
const NEW_OWNER = "0x0000000000000000000000000000000000ce7701" as Address;
// The smart account the mock client signs as, i.e. the device wallet sending the userOp.
const ACCOUNT = "0x000000000000000000000000000000000000acc7" as Address;
const OWNER_KEY: [Hex, Hex] = [
  "0x6B17D1F2E12C4247F8BCE6E563A440F277037D812DEB33A0F4A13945D898C291",
  "0x4FE342E2FE1A7F9B8EE7EB4A7C0F9E162BCE33576B315ECECBB6406837BF51F1",
];
const MESSAGE_HASH = "0x00000000000000000000000000000000000000000000000000000000000000a1" as Hex;
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

const F = baseSepoliaFactoryAddresses;

// Only functions that can genuinely succeed via a device-wallet userOp belong on
// this surface: admin/registry-gated and always-reverting functions are not here,
// and `view` functions are `readContract` calls (see the read table below). Each row
// asserts the SDK sends `{ target, data }` matching an independent encodeFunctionData
// of the expected (abi, functionName, args).
const userOpCases: Array<{
  label: string;
  run: (c: ReturnType<typeof makeMockSmartAccountClient>) => Promise<unknown>;
  target: Address;
  data: Hex;
}> = [
  // deviceWallet.ts - self-callable via `execute` (msg.sender == the device wallet)
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
    label: "deviceWallet._transferOwnership",
    run: (c) => deviceWallet._transferOwnership(c, WALLET, OWNER_KEY),
    target: WALLET,
    data: encodeFunctionData({ abi: DeviceWallet, functionName: "transferOwnership", args: [OWNER_KEY] }),
  },
  {
    label: "deviceWallet._addDeposit",
    run: (c) => deviceWallet._addDeposit(c, WALLET, 500n),
    target: WALLET,
    data: encodeFunctionData({ abi: DeviceWallet, functionName: "addDeposit", args: [] }),
  },
  {
    label: "deviceWallet._withdrawDepositTo",
    run: (c) => deviceWallet._withdrawDepositTo(c, WALLET, NEW_OWNER, 500n),
    target: WALLET,
    data: encodeFunctionData({ abi: DeviceWallet, functionName: "withdrawDepositTo", args: [NEW_OWNER, 500n] }),
  },
  {
    label: "deviceWallet._removeESIMWallet",
    run: (c) => deviceWallet._removeESIMWallet(c, WALLET, ESIM, false),
    target: WALLET,
    data: encodeFunctionData({ abi: DeviceWallet, functionName: "removeESIMWallet", args: [ESIM, false] }),
  },
  // eSIMWallet.ts - the eSIM wallet's owner IS the device-wallet sender (onlyDeviceWallet)
  {
    label: "eSIMWallet._buyDataBundle",
    run: (c) => eSIMWallet._buyDataBundle(c, ESIM, BUNDLE),
    target: ESIM,
    data: encodeFunctionData({ abi: ESIMWallet, functionName: "buyDataBundle", args: [BUNDLE] }),
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
    label: "eSIMWallet._setDataBundlePriceCap",
    run: (c) => eSIMWallet._setDataBundlePriceCap(c, ESIM, 5n * 10n ** 18n),
    target: ESIM,
    data: encodeFunctionData({ abi: ESIMWallet, functionName: "setDataBundlePriceCap", args: [5n * 10n ** 18n] }),
  },
  {
    label: "eSIMWallet._sendETHToDeviceWallet",
    run: (c) => eSIMWallet._sendETHToDeviceWallet(c, ESIM, 3n),
    target: ESIM,
    data: encodeFunctionData({ abi: ESIMWallet, functionName: "sendETHToDeviceWallet", args: [3n] }),
  },
  // eSIMWalletFactory.ts - a registered device wallet passes isDeviceWalletValid(msg.sender)
  {
    label: "eSIMWalletFactory._deployESIMWalletWithUserOp",
    run: (c) => eSIMWalletFactory._deployESIMWalletWithUserOp(c, WALLET, 1n),
    target: F.ESIM_WALLET_FACTORY,
    data: encodeFunctionData({ abi: ESIMWalletFactory, functionName: "deployESIMWallet", args: [WALLET, 1n] }),
  },
  // registry.ts - `onlyDeviceWallet`, so msg.sender is the device wallet sending the userOp
  {
    // The registry only accepts the caller as the new holder, so the SDK fills it in.
    label: "registry._bindESIMWallet",
    run: (c) => registry._bindESIMWallet(c, ESIM),
    target: F.REGISTRY,
    data: encodeFunctionData({ abi: Registry, functionName: "bindESIMWallet", args: [ESIM, ACCOUNT] }),
  },
  {
    label: "registry._toggleESIMWalletStandbyStatus",
    run: (c) => registry._toggleESIMWalletStandbyStatus(c, ESIM, true),
    target: F.REGISTRY,
    data: encodeFunctionData({ abi: Registry, functionName: "toggleESIMWalletStandbyStatus", args: [ESIM, true] }),
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
    expect(arg.calls).toHaveLength(1);
    expect(arg.calls[0].to).toBe(target);
    expect(arg.calls[0].data).toBe(data);
  });

  it.each(userOpCases)("$label throws MISSING_SMART_WALLET without an account", async ({ run }) => {
    const client = makeMockSmartAccountClient({ withAccount: false });
    await expect(run(client)).rejects.toThrow(/smart wallet/i);
  });

  // addDeposit is payable and the amount rides as msg.value, not as an argument.
  it("deviceWallet._addDeposit sends the amount as the call's value", async () => {
    const client = makeMockSmartAccountClient();
    await deviceWallet._addDeposit(client, WALLET, 500n);

    const arg = (client.sendUserOperation as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(arg.calls[0].value).toBe(500n);
  });
});

// `view` functions are `readContract` calls that return the actual value rather
// than a userOp hash. Each row asserts the SDK reads the expected
// (address, functionName, args) and does not spend a userOp.
const readCases: Array<{
  label: string;
  run: (c: ReturnType<typeof makeMockSmartAccountClient>) => Promise<unknown>;
  address: Address;
  functionName: string;
  args: readonly unknown[];
}> = [
  {
    label: "deviceWallet._getVaultAddress",
    run: (c) => deviceWallet._getVaultAddress(c, WALLET),
    address: WALLET,
    functionName: "getVaultAddress",
    args: [],
  },
  {
    label: "deviceWallet._getDeposit",
    run: (c) => deviceWallet._getDeposit(c, WALLET),
    address: WALLET,
    functionName: "getDeposit",
    args: [],
  },
  {
    label: "deviceWallet._deviceUniqueIdentifier",
    run: (c) => deviceWallet._deviceUniqueIdentifier(c, WALLET),
    address: WALLET,
    functionName: "deviceUniqueIdentifier",
    args: [],
  },
  {
    label: "deviceWallet._isValidESIMWallet",
    run: (c) => deviceWallet._isValidESIMWallet(c, WALLET, ESIM),
    address: WALLET,
    functionName: "isValidESIMWallet",
    args: [ESIM],
  },
  {
    label: "deviceWallet._canPullETH",
    run: (c) => deviceWallet._canPullETH(c, WALLET, ESIM),
    address: WALLET,
    functionName: "canPullETH",
    args: [ESIM],
  },
  {
    label: "deviceWallet._isValidSignature",
    run: (c) => deviceWallet._isValidSignature(c, WALLET, MESSAGE_HASH, "0x01000000000000dead"),
    address: WALLET,
    functionName: "isValidSignature",
    args: [MESSAGE_HASH, "0x01000000000000dead"],
  },
  {
    label: "deviceWallet._registry",
    run: (c) => deviceWallet._registry(c, WALLET),
    address: WALLET,
    functionName: "registry",
    args: [],
  },
  {
    label: "deviceWallet._eSIMWalletFactory",
    run: (c) => deviceWallet._eSIMWalletFactory(c, WALLET),
    address: WALLET,
    functionName: "eSIMWalletFactory",
    args: [],
  },
  {
    label: "deviceWallet._entryPoint",
    run: (c) => deviceWallet._entryPoint(c, WALLET),
    address: WALLET,
    functionName: "entryPoint",
    args: [],
  },
  {
    label: "deviceWallet._verifier",
    run: (c) => deviceWallet._verifier(c, WALLET),
    address: WALLET,
    functionName: "verifier",
    args: [],
  },
  {
    label: "eSIMWallet._owner",
    run: (c) => eSIMWallet._owner(c, ESIM),
    address: ESIM,
    functionName: "owner",
    args: [],
  },
  {
    label: "eSIMWallet._deviceWallet",
    run: (c) => eSIMWallet._deviceWallet(c, ESIM),
    address: ESIM,
    functionName: "deviceWallet",
    args: [],
  },
  {
    label: "eSIMWallet._transactionHistory",
    run: (c) => eSIMWallet._transactionHistory(c, ESIM, 2n),
    address: ESIM,
    functionName: "transactionHistory",
    args: [2n],
  },
  {
    label: "deviceWalletFactory._getAddress",
    run: (c) => deviceWalletFactory._getAddress(c, "Device_11", OWNER_KEY, 1n),
    address: F.DEVICE_WALLET_FACTORY,
    functionName: "getCounterFactualAddress",
    args: [OWNER_KEY, "Device_11", 1n],
  },
  {
    label: "deviceWalletFactory._getCurrentDeviceWalletImplementation",
    run: (c) => deviceWalletFactory._getCurrentDeviceWalletImplementation(c),
    address: F.DEVICE_WALLET_FACTORY,
    functionName: "getCurrentDeviceWalletImplementation",
    args: [],
  },
  {
    // uid first here, unlike getCounterFactualAddress, which takes the key first.
    label: "deviceWalletFactory._preCreateAccountValidation",
    run: (c) => deviceWalletFactory._preCreateAccountValidation(c, "Device_11", OWNER_KEY),
    address: F.DEVICE_WALLET_FACTORY,
    functionName: "preCreateAccountValidation",
    args: ["Device_11", OWNER_KEY],
  },
  {
    label: "deviceWalletFactory._deviceWalletInfoAdded",
    run: (c) => deviceWalletFactory._deviceWalletInfoAdded(c, WALLET),
    address: F.DEVICE_WALLET_FACTORY,
    functionName: "deviceWalletInfoAdded",
    args: [WALLET],
  },
  { label: "deviceWalletFactory._beacon", run: (c) => deviceWalletFactory._beacon(c), address: F.DEVICE_WALLET_FACTORY, functionName: "beacon", args: [] },
  { label: "deviceWalletFactory._registry", run: (c) => deviceWalletFactory._registry(c), address: F.DEVICE_WALLET_FACTORY, functionName: "registry", args: [] },
  { label: "deviceWalletFactory._entryPoint", run: (c) => deviceWalletFactory._entryPoint(c), address: F.DEVICE_WALLET_FACTORY, functionName: "entryPoint", args: [] },
  { label: "deviceWalletFactory._verifier", run: (c) => deviceWalletFactory._verifier(c), address: F.DEVICE_WALLET_FACTORY, functionName: "verifier", args: [] },
  {
    label: "eSIMWalletFactory._getCurrentESIMWalletImplementation",
    run: (c) => eSIMWalletFactory._getCurrentESIMWalletImplementation(c),
    address: F.ESIM_WALLET_FACTORY,
    functionName: "getCurrentESIMWalletImplementation",
    args: [],
  },
  {
    label: "registry._isDeviceIdentifierAlreadyUsed",
    run: (c) => registry._isDeviceIdentifierAlreadyUsed(c, "Device_11"),
    address: F.REGISTRY,
    functionName: "isDeviceIdentifierAlreadyUsed",
    args: ["Device_11"],
  },
  { label: "registry._paused", run: (c) => registry._paused(c), address: F.REGISTRY, functionName: "paused", args: [] },
  { label: "registry._requireNotPaused", run: (c) => registry._requireNotPaused(c), address: F.REGISTRY, functionName: "requireNotPaused", args: [] },
  { label: "registry._isESIMWalletValid", run: (c) => registry._isESIMWalletValid(c, ESIM), address: F.REGISTRY, functionName: "isESIMWalletValid", args: [ESIM] },
  { label: "registry._isESIMWalletOnStandby", run: (c) => registry._isESIMWalletOnStandby(c, ESIM), address: F.REGISTRY, functionName: "isESIMWalletOnStandby", args: [ESIM] },
  { label: "registry._isDeviceWalletValid", run: (c) => registry._isDeviceWalletValid(c, WALLET), address: F.REGISTRY, functionName: "isDeviceWalletValid", args: [WALLET] },
  { label: "registry._uniqueIdentifierToDeviceWallet", run: (c) => registry._uniqueIdentifierToDeviceWallet(c, "Device_11"), address: F.REGISTRY, functionName: "uniqueIdentifierToDeviceWallet", args: ["Device_11"] },
  { label: "registry._isESIMIdentifierClaimed", run: (c) => registry._isESIMIdentifierClaimed(c, "eid-1"), address: F.REGISTRY, functionName: "isESIMIdentifierClaimed", args: ["eid-1"] },
  { label: "registry._eSIMWalletForIdentifier", run: (c) => registry._eSIMWalletForIdentifier(c, "eid-1"), address: F.REGISTRY, functionName: "eSIMWalletForIdentifier", args: ["eid-1"] },
  { label: "registry._defaultDataBundlePriceCap", run: (c) => registry._defaultDataBundlePriceCap(c), address: F.REGISTRY, functionName: "defaultDataBundlePriceCap", args: [] },
  { label: "registry._requireDeviceIdentifierNotReserved", run: (c) => registry._requireDeviceIdentifierNotReserved(c, "Device_11"), address: F.REGISTRY, functionName: "requireDeviceIdentifierNotReserved", args: ["Device_11"] },
  {
    label: "p256Verifier._verifySignature",
    run: (c) => p256Verifier._verifySignature(c, "0x1234", true, WEBAUTHN_SIG, 10n, 20n),
    address: F.P256VERIFIER,
    functionName: "verifySignature",
    args: ["0x1234", true, WEBAUTHN_SIG, 10n, 20n],
  },
];

describe("sub-package view reads", () => {
  it.each(readCases)("$label reads the expected address + call (no userOp)", async ({ run, address, functionName, args }) => {
    const client = makeMockSmartAccountClient();
    await run(client);

    const read = client.readContract as ReturnType<typeof vi.fn>;
    expect(read).toHaveBeenCalledTimes(1);
    const arg = read.mock.calls[0][0];
    expect(arg.address).toBe(address);
    expect(arg.functionName).toBe(functionName);
    expect(arg.args).toEqual(args);

    // A read must not burn a userOp.
    const send = client.sendUserOperation as ReturnType<typeof vi.fn>;
    expect(send).not.toHaveBeenCalled();
  });
});

// --- EOA writeContract paths ------------------------------------------------
describe("EOA writeContract paths", () => {
  it("deviceWalletFactory._createAccountWithEOA calls writeContract on the factory", async () => {
    const { makeMockWalletClient } = await import("../utils/mockClient.js");
    const client = makeMockWalletClient({ chainId: 84532, account: "0x00000000000000000000000000000000000e0a01" });

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

  it("_createAccountWithEOA throws MISSING_EOA_WALLET without an account", async () => {
    const { makeMockWalletClient } = await import("../utils/mockClient.js");
    const client = makeMockWalletClient({ chainId: 84532 });
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
    const client = makeMockWalletClient({ chainId: 84532 });

    const owner = await _getOwner(client, WALLET);
    expect(owner).toEqual(OWNER_KEY);
    vi.doUnmock("viem");
  });
});
