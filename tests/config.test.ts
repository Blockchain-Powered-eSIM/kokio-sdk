import { describe, it, expect, vi } from "vitest";
import { type Address } from "viem";

// `config.ts` pulls in `smartAccountClass.ts` -> `createSmartAccount.ts`, which
// statically imports `react-native-passkey`, a native RN module Node's loader
// cannot parse. Unused by anything under test here, only needed to load.
vi.mock("react-native-passkey", () => ({ Passkey: {} }));

import { makeMockWalletClient, makeMockSmartAccountClient } from "./utils/mockClient.js";
import { Kokio } from "../src/config.js";

const CREDENTIAL_ID = "credential-1";
const RP_ID = "kokio.test";
const PIMLICO_KEY = "pimlico-key";
const GAS_POLICY_ID = "policy-1";
const CHAIN_ID = 84532;

const DEVICE_A = "0x0000000000000000000000000000000000000a11" as Address;
const DEVICE_B = "0x0000000000000000000000000000000000000b22" as Address;
const ESIM_A = "0x0000000000000000000000000000000000005111" as Address;
const ESIM_B = "0x0000000000000000000000000000000000005222" as Address;

const newKokio = (opts?: {
  withSmartAccountClient?: boolean;
  deviceWalletAddress?: Address;
  eSIMWalletAddress?: Address;
}) => {
  const viemWalletClient = makeMockWalletClient({ chainId: CHAIN_ID });
  const smartAccountClient =
    opts?.withSmartAccountClient === false ? undefined : makeMockSmartAccountClient({ chainId: CHAIN_ID });

  return new Kokio(
    viemWalletClient,
    CREDENTIAL_ID,
    RP_ID,
    PIMLICO_KEY,
    GAS_POLICY_ID,
    smartAccountClient,
    opts?.deviceWalletAddress,
    opts?.eSIMWalletAddress,
  );
};

describe("Kokio construction", () => {
  it("exposes only smartAccount without a smartAccountClient", () => {
    const kokio = newKokio({ withSmartAccountClient: false });
    expect(kokio.smartAccount).toBeDefined();
    expect(kokio.deviceWalletFactory).toBeUndefined();
    expect(kokio.eSIMWalletFactory).toBeUndefined();
    expect(kokio.registry).toBeUndefined();
    expect(kokio.P256Verifier).toBeUndefined();
    expect(kokio.deviceWallet).toBeUndefined();
    expect(kokio.eSIMWallet).toBeUndefined();
  });

  it("wires the chain-wide surfaces once a smartAccountClient is supplied", () => {
    const kokio = newKokio();
    expect(kokio.deviceWalletFactory).toBeDefined();
    expect(kokio.eSIMWalletFactory).toBeDefined();
    expect(kokio.registry).toBeDefined();
    expect(kokio.P256Verifier).toBeDefined();
    // Instance surfaces stay undefined until their address is known.
    expect(kokio.deviceWallet).toBeUndefined();
    expect(kokio.eSIMWallet).toBeUndefined();
  });

  it("wires the instance surfaces when addresses are passed to the constructor", () => {
    const kokio = newKokio({ deviceWalletAddress: DEVICE_A, eSIMWalletAddress: ESIM_A });
    expect(kokio.deviceWallet).toBeDefined();
    expect(kokio.eSIMWallet).toBeDefined();
    expect(kokio.deviceWalletAddress).toBe(DEVICE_A);
    expect(kokio.eSIMWalletAddress).toBe(ESIM_A);
  });
});

describe("Kokio setters", () => {
  it("setDeviceWalletAddress binds the address so deviceWallet calls target it", async () => {
    const kokio = newKokio();
    const client = kokio.smartAccountClient!;

    const ret = kokio.setDeviceWalletAddress(DEVICE_A);
    expect(ret).toBe(kokio); // returns this for chaining
    expect(kokio.deviceWalletAddress).toBe(DEVICE_A);

    await kokio.deviceWallet!.addDeposit(1n);
    const arg = (client.sendUserOperation as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(arg.calls[0].to).toBe(DEVICE_A);
  });

  it("setDeviceWalletAddress re-points an already-bound surface to the new address", async () => {
    const kokio = newKokio({ deviceWalletAddress: DEVICE_A });
    const client = kokio.smartAccountClient!;

    kokio.setDeviceWalletAddress(DEVICE_B);
    await kokio.deviceWallet!.addDeposit(1n);
    const arg = (client.sendUserOperation as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(arg.calls[0].to).toBe(DEVICE_B);
  });

  it("setDeviceWalletAddress leaves deviceWallet undefined without a smartAccountClient", () => {
    const kokio = newKokio({ withSmartAccountClient: false });
    kokio.setDeviceWalletAddress(DEVICE_A);
    expect(kokio.deviceWalletAddress).toBe(DEVICE_A);
    expect(kokio.deviceWallet).toBeUndefined();
  });

  it("setESIMWalletAddress binds the address so eSIMWallet calls target it", async () => {
    const kokio = newKokio();
    const client = kokio.smartAccountClient!;

    kokio.setESIMWalletAddress(ESIM_A);
    await kokio.eSIMWallet!.acceptOwnershipTransfer();
    const arg = (client.sendUserOperation as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(arg.calls[0].to).toBe(ESIM_A);
  });

  it("setESIMWalletAddress lets a user with several eSIM wallets switch which one is active", async () => {
    const kokio = newKokio();
    const client = kokio.smartAccountClient!;

    kokio.setESIMWalletAddress(ESIM_A);
    await kokio.eSIMWallet!.acceptOwnershipTransfer();

    kokio.setESIMWalletAddress(ESIM_B);
    await kokio.eSIMWallet!.acceptOwnershipTransfer();

    const send = client.sendUserOperation as ReturnType<typeof vi.fn>;
    expect(send.mock.calls[0][0].calls[0].to).toBe(ESIM_A);
    expect(send.mock.calls[1][0].calls[0].to).toBe(ESIM_B);
  });

  it("setESIMWalletAddress leaves eSIMWallet undefined without a smartAccountClient", () => {
    const kokio = newKokio({ withSmartAccountClient: false });
    kokio.setESIMWalletAddress(ESIM_A);
    expect(kokio.eSIMWalletAddress).toBe(ESIM_A);
    expect(kokio.eSIMWallet).toBeUndefined();
  });

  it("supports chaining setters", () => {
    const kokio = newKokio().setDeviceWalletAddress(DEVICE_A).setESIMWalletAddress(ESIM_A);
    expect(kokio.deviceWallet).toBeDefined();
    expect(kokio.eSIMWallet).toBeDefined();
  });
});

describe("Kokio constants", () => {
  it("memoizes: repeated awaits resolve to the same cached object", async () => {
    const kokio = newKokio();
    const a = await kokio.constants;
    const b = await kokio.constants;
    expect(a).toBe(b); // same resolved object, not a re-computed copy
  });
});
