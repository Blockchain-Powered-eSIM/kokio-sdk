import { describe, expect, it, vi } from "vitest";

// Node cannot load the native passkey module, so an app's test setup has to stub
// it the same way. Nothing here signs, so an empty stub is enough.
vi.mock("react-native-passkey", () => ({ Passkey: {} }));

import * as root from "kokio-sdk";
import * as admin from "kokio-sdk/admin";
import * as types from "kokio-sdk/types";
import * as abis from "kokio-sdk/abis";

// Imports go through the package name, so they resolve through package.json
// `exports` to the built dist/ exactly as they do for an installed copy.

const ERROR_CLASSES = [
  "KokioError",
  "NullOrUndefinedValueError",
  "MissingSmartWalletError",
  "MissingEOAWalletError",
  "InvalidClientError",
  "UnsupportedChainError",
  "UnconfiguredChainError",
  "CounterfactualMismatchError",
  "ContractRevertError",
  "BatchSizeOutOfRangeError",
  "DepositOnResumeError",
  "ESIMWalletNotLazyDeployedError",
  "MissingBatchEventError",
  "StalledBatchError",
] as const;

describe("package entry points", () => {
  it("kokio-sdk exports Kokio, the error classes and the revert decoder", () => {
    expect(typeof root.Kokio).toBe("function");
    expect(typeof root.decodeContractRevert).toBe("function");
    for (const name of ERROR_CLASSES) {
      expect(root, name).toHaveProperty(name);
      expect(new (root as any)[name]()).toBeInstanceOf(root.KokioError);
    }
  });

  it("kokio-sdk/admin exports KokioAdmin, OperationState and the same error classes", () => {
    expect(typeof admin.KokioAdmin).toBe("function");
    expect(admin.OperationState).toBeDefined();
    expect(typeof admin.decodeContractRevert).toBe("function");
    for (const name of ERROR_CLASSES) {
      expect(admin, name).toHaveProperty(name);
      // Both entry points must hand out the same class, or instanceof fails across them.
      expect((admin as any)[name]).toBe((root as any)[name]);
    }
  });

  it("kokio-sdk/types exports the Settlement enum in contract order", () => {
    expect(types.Settlement.DeviceWallet).toBe(0);
    expect(types.Settlement.ExternalWallet).toBe(1);
    expect(types.Settlement.Fiat).toBe(2);
  });

  it("kokio-sdk/abis exports every contract ABI", () => {
    for (const name of [
      "DeviceWallet",
      "DeviceWalletFactory",
      "ESIMWallet",
      "ESIMWalletFactory",
      "LazyWalletRegistry",
      "P256Verifier",
      "Registry",
      "RegistryHelper",
      "BeaconProxy",
      "ProtocolAdmin",
      "PaymentAdapter",
    ]) {
      expect(Array.isArray((abis as any)[name]), name).toBe(true);
    }
  });
});
