import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createWalletClient, http, type Address } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

// The passkey is the one thing Node cannot provide. Everything the SDK does with
// the assertion it returns runs as shipped.
const passkeyGet = vi.hoisted(() => vi.fn());
vi.mock("react-native-passkey", () => ({ Passkey: { get: passkeyGet } }));

import { Kokio } from "kokio-sdk";
import { KokioAdmin } from "kokio-sdk/admin";
import { Registry } from "kokio-sdk/abis";
import type { KokioSmartAccountClient } from "kokio-sdk/types";

import { impersonateAdmin } from "../utils/forkChain.js";
import { createSoftSigner, type SoftSigner } from "../utils/softP256Signer.js";
import { asPasskey } from "./fixtures/passkeyAuthenticator.js";
import { expectSponsored } from "./fixtures/sponsorship.js";
import { startForkStack, type ForkStack } from "./fixtures/forkStack.js";

const RP_ID = "kokio.test";
const CREDENTIAL_ID = "consumer-test-credential";
const REGISTRY: Address = "0x916b6b554119c789EF3026EDeB0E1Ba741b42A49";

// The four things a user does with the app, in order, each as a sponsored user
// operation through the public SDK. Later steps build on the state earlier ones
// leave, so the steps share one fork and run in sequence.
describe("user journey on a Base Sepolia fork", () => {
  let stack: ForkStack;
  let signer: SoftSigner;
  let kokio: Kokio;
  let client: KokioSmartAccountClient;
  let deviceWallet: Address;

  const uid = `consumer-${Date.now()}`;
  const salt = BigInt(Date.now());

  beforeAll(async () => {
    stack = await startForkStack();

    signer = createSoftSigner(RP_ID);
    passkeyGet.mockImplementation(asPasskey(signer));

    // The app's own wallet client. The passkey signs user operations; this
    // client only carries the chain and RPC.
    const walletClient = createWalletClient({
      account: privateKeyToAccount(generatePrivateKey()),
      chain: baseSepolia,
      transport: http(stack.fork.rpcUrl),
    });

    const setup = new Kokio(walletClient, CREDENTIAL_ID, RP_ID, "unused-on-fork", "unused-on-fork");
    const account = await setup.smartAccount.getSmartWallet(uid, signer.ownerKey, salt);
    client = await setup.smartAccount.getSmartWalletClient(account, { bundlerUrl: stack.bundlerUrl });

    deviceWallet = account.address;
    kokio = new Kokio(walletClient, CREDENTIAL_ID, RP_ID, "unused-on-fork", "unused-on-fork", client, deviceWallet);
  }, 180_000);

  afterAll(async () => {
    await stack?.stop();
  });

  it("deploys the device wallet with its first sponsored user operation", async () => {
    expect(await kokio.deviceWalletFactory!.getAddress(uid, signer.ownerKey, salt)).toBe(deviceWallet);
    expect(await stack.fork.publicClient.getCode({ address: deviceWallet })).toBeUndefined();

    await expectSponsored(client, stack.fork.publicClient, () => kokio.deviceWallet!.sendUserOperation([]));

    expect(await stack.fork.publicClient.getCode({ address: deviceWallet })).toMatch(/^0x[0-9a-f]+$/i);
    expect(await kokio.deviceWallet!.getOwner()).toEqual(signer.ownerKey);
    expect(await kokio.deviceWallet!.deviceUniqueIdentifier()).toBe(uid);
  }, 120_000);

  it("is registered by the backend after the permissionless deploy", async () => {
    // createAccount through the EntryPoint cannot write to the registry, so the
    // backend records the wallet afterwards (DeviceWalletFactory.postCreateAccount).
    const read = () => stack.fork.publicClient.readContract({
      address: REGISTRY, abi: Registry, functionName: "isDeviceWalletValid", args: [deviceWallet],
    });
    expect(await read()).toBe(false);

    const { client: adminClient } = await impersonateAdmin(stack.fork);
    const hash = await new KokioAdmin(adminClient).deviceWalletFactory.postCreateAccount(deviceWallet, uid, signer.ownerKey, salt);
    await stack.fork.publicClient.waitForTransactionReceipt({ hash });

    expect(await read()).toBe(true);
    expect(await kokio.deviceWalletFactory!.deviceWalletInfoAdded(deviceWallet)).toBe(true);
  }, 120_000);
});
