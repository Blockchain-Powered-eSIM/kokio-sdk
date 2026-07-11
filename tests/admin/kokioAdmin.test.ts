import { describe, it, expect, vi } from "vitest";
import { type Address } from "viem";

import { makeMockWalletClient } from "../utils/mockClient.js";
import { KokioAdmin, MissingEOAWalletError } from "../../src/admin/config-admin.js";

const EOA = "0x00000000000000000000000000000000000e0a01" as Address;
const DEVICE_A = "0x0000000000000000000000000000000000000a11" as Address;
const DEVICE_B = "0x0000000000000000000000000000000000000b22" as Address;
const ESIM_A = "0x0000000000000000000000000000000000005111" as Address;

const CHAIN_ID = 11155111;
const lastWrite = (client: ReturnType<typeof makeMockWalletClient>) =>
  (client.writeContract as ReturnType<typeof vi.fn>).mock.calls.at(-1)![0];

describe("KokioAdmin construction", () => {
  it("exposes the chain-wide surfaces with only a wallet client", () => {
    const admin = new KokioAdmin(makeMockWalletClient({ chainId: CHAIN_ID, account: EOA }));
    expect(admin.deviceWalletFactory).toBeDefined();
    expect(admin.eSIMWalletFactory).toBeDefined();
    expect(admin.registry).toBeDefined();
    expect(admin.lazyWalletRegistry).toBeDefined();
    // Instance surfaces stay undefined until their address is known.
    expect(admin.deviceWallet).toBeUndefined();
    expect(admin.eSIMWallet).toBeUndefined();
  });

  it("wires the instance surfaces when addresses are passed to the constructor", () => {
    const admin = new KokioAdmin(makeMockWalletClient({ chainId: CHAIN_ID, account: EOA }), DEVICE_A, ESIM_A);
    expect(admin.deviceWallet).toBeDefined();
    expect(admin.eSIMWallet).toBeDefined();
    expect(admin.deviceWalletAddress).toBe(DEVICE_A);
    expect(admin.eSIMWalletAddress).toBe(ESIM_A);
  });

  it("re-exports the KokioError surface", () => {
    expect(typeof MissingEOAWalletError).toBe("function");
  });
});

describe("KokioAdmin setters", () => {
  it("setDeviceWalletAddress binds the address so deviceWallet calls target it", async () => {
    const client = makeMockWalletClient({ chainId: CHAIN_ID, account: EOA });
    const admin = new KokioAdmin(client);

    const ret = admin.setDeviceWalletAddress(DEVICE_A);
    expect(ret).toBe(admin); // returns this for chaining
    expect(admin.deviceWalletAddress).toBe(DEVICE_A);

    await admin.deviceWallet!.deployESIMWallet(true, 1n);
    expect(lastWrite(client).address).toBe(DEVICE_A);
  });

  it("setDeviceWalletAddress re-points an already-bound surface to the new address", async () => {
    const client = makeMockWalletClient({ chainId: CHAIN_ID, account: EOA });
    const admin = new KokioAdmin(client, DEVICE_A);

    admin.setDeviceWalletAddress(DEVICE_B);
    await admin.deviceWallet!.deployESIMWallet(false, 2n);
    expect(lastWrite(client).address).toBe(DEVICE_B);
  });

  it("setESIMWalletAddress binds the address so eSIMWallet calls target it", async () => {
    const client = makeMockWalletClient({ chainId: CHAIN_ID, account: EOA });
    const admin = new KokioAdmin(client);

    admin.setESIMWalletAddress(ESIM_A);
    await admin.eSIMWallet!.buyDataBundle({ dataBundleID: "b", dataBundlePrice: 1n });
    expect(lastWrite(client).address).toBe(ESIM_A);
  });

  it("setWalletClient swaps the client while preserving bound addresses", async () => {
    const first = makeMockWalletClient({ chainId: CHAIN_ID, account: EOA });
    const admin = new KokioAdmin(first, DEVICE_A);

    const second = makeMockWalletClient({ chainId: CHAIN_ID, account: EOA });
    const ret = admin.setWalletClient(second);
    expect(ret).toBe(admin);

    // The bound device-wallet address survives the client swap...
    expect(admin.deviceWalletAddress).toBe(DEVICE_A);
    await admin.deviceWallet!.deployESIMWallet(true, 1n);

    // ...and calls now flow through the new client, not the old one.
    expect((second.writeContract as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1);
    expect((first.writeContract as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(0);
    expect(lastWrite(second).address).toBe(DEVICE_A);
  });

  it("supports chaining setters", () => {
    const admin = new KokioAdmin(makeMockWalletClient({ chainId: CHAIN_ID, account: EOA }))
      .setDeviceWalletAddress(DEVICE_A)
      .setESIMWalletAddress(ESIM_A);
    expect(admin.deviceWallet).toBeDefined();
    expect(admin.eSIMWallet).toBeDefined();
  });
});
