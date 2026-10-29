import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createWalletClient, http, parseEther, type WalletClient } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

import { KokioAdmin } from "kokio-sdk/admin";
import { DeviceWalletFactory } from "kokio-sdk/abis";

import { forkProfile, impersonateRegistryOwner, startFork, type Fork } from "../utils/forkChain.js";
import { createSoftSigner } from "../utils/softP256Signer.js";
import { testDeviceId } from "./fixtures/testLabels.js";

// A backend holds its admin key locally and talks to a hosted RPC that has no
// accounts of its own, so every admin write has to be signed in process. The
// key here is fresh, so anvil cannot sign for it either, which is what makes a
// write sent as a bare address fail the way it would against a hosted RPC.
describe(`backend admin with a local private key on a ${forkProfile().label} fork`, () => {
  let fork: Fork;
  let backend: WalletClient;
  let admin: KokioAdmin;

  beforeAll(async () => {
    fork = await startFork();

    const account = privateKeyToAccount(generatePrivateKey());
    await fork.testClient.setBalance({ address: account.address, value: parseEther("1") });
    backend = createWalletClient({ account, chain: fork.chain, transport: http(fork.rpcUrl) });
    admin = new KokioAdmin(backend);

    // The registry's owner (the timelock on the live deployment) nominates the backend.
    const { client: owner } = await impersonateRegistryOwner(fork);
    const hash = await new KokioAdmin(owner).registry.requestAdminUpdate(account.address);
    await fork.publicClient.waitForTransactionReceipt({ hash });
  }, 120_000);

  afterAll(async () => {
    await fork?.stop();
  });

  it("accepts the admin role", async () => {
    const hash = await admin.registry.acceptAdminUpdate();
    await fork.publicClient.waitForTransactionReceipt({ hash });

    expect(await admin.registry.eSIMWalletAdmin()).toBe(backend.account!.address);
  }, 60_000);

  it("registers a device wallet deployed through the permissionless route", async () => {
    const uid = testDeviceId();
    const { ownerKey } = createSoftSigner();
    const salt = 7n;

    const deploy = await fork.funded.writeContract({
      address: fork.addresses.DEVICE_WALLET_FACTORY, abi: DeviceWalletFactory, functionName: "createAccount",
      args: [uid, ownerKey, salt], chain: fork.chain, account: fork.funded.account!,
    });
    await fork.publicClient.waitForTransactionReceipt({ hash: deploy });
    const deviceWallet = await admin.deviceWalletFactory.getCounterFactualAddress(ownerKey, uid, salt);

    const hash = await admin.deviceWalletFactory.postCreateAccount(deviceWallet, uid, ownerKey, salt);
    await fork.publicClient.waitForTransactionReceipt({ hash });

    expect(await admin.registry.isDeviceWalletValid(deviceWallet)).toBe(true);
  }, 60_000);
});
