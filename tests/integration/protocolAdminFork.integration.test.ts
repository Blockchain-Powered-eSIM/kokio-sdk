import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { getContract, type Address, type Hex } from "viem";

// `createSmartAccount.ts` (pulled in transitively) statically imports
// `react-native-passkey`, a native module Node's loader cannot parse. This suite
// never signs a passkey, so stub it out of the graph as the other suites do.
vi.mock("react-native-passkey", () => ({ Passkey: {} }));

import { KokioAdmin } from "../../src/admin/config-admin.js";
import { Registry } from "../../src/abis/index.js";
import { baseSepoliaFactoryAddresses } from "../../src/logic/constants.js";
import { OperationState } from "../../src/logic/admin/reads/protocolAdmin.reads.js";
import { forkAvailable, impersonate, startFork, type Fork } from "../utils/forkChain.js";

const F = baseSepoliaFactoryAddresses;

// Role holders on the live Base Sepolia deployment, each confirmed with
// `cast call <ProtocolAdmin> "hasRole(bytes32,address)"`. The suite re-checks
// both against the fork before using them, so a redeployment fails loudly here
// rather than somewhere further in.
const PROPOSER = "0x97a2103118064820180fb3acbCBedDe6E4D9fCb9" as Address;
const GUARDIAN = "0xA71daa87b7C653843b177Ef296B8a7aB90DebE1A" as Address;

// Checksummed, since the registry hands the address back in that form.
const NEW_VAULT = "0x000000000000000000000000000000000000aDA1" as Address;

const readRegistry = (fork: Fork) => getContract({
  abi: Registry,
  address: F.REGISTRY,
  client: fork.publicClient,
});

// `writeContract` sends without simulating, so a call the chain refuses still
// returns a hash and only shows up as a reverted receipt. Assert on that rather
// than on a rejected promise.
const expectReverted = async (fork: Fork, send: Promise<Hex>) => {
  const receipt = await fork.publicClient.waitForTransactionReceipt({ hash: await send });
  expect(receipt.status).toBe("reverted");
};

// The timelock path against a local Base Sepolia fork: schedule an owner call as
// the real proposer, move the clock past the delay, and execute from an account
// holding no role at all. Skips cleanly unless INTEGRATION=1 and Foundry is
// installed.
describe.skipIf(!forkAvailable())("ProtocolAdmin - timelock on a Base Sepolia fork", () => {
  let fork: Fork;
  let proposerSdk: KokioAdmin;
  let guardianSdk: KokioAdmin;
  let anyoneSdk: KokioAdmin;

  beforeAll(async () => {
    fork = await startFork(8547);

    proposerSdk = new KokioAdmin(await impersonate(fork, PROPOSER));
    guardianSdk = new KokioAdmin(await impersonate(fork, GUARDIAN));
    // The funded anvil dev account. Holds no role on the timelock.
    anyoneSdk = new KokioAdmin(fork.funded);
  }, 60_000);

  afterAll(async () => {
    await fork?.stop();
  });

  it("the registry is owned by the timelock, and the two role holders still hold their roles", async () => {
    const pa = proposerSdk.protocolAdmin;

    expect(await proposerSdk.registry.owner()).toBe(F.PROTOCOL_ADMIN);
    expect(await pa.hasRole(await pa.PROPOSER_ROLE(), PROPOSER)).toBe(true);
    expect(await pa.hasRole(await pa.GUARDIAN_ROLE(), GUARDIAN)).toBe(true);
  }, 60_000);

  it("an owner call sent straight from an EOA reverts", async () => {
    // The whole reason the timelock path exists: the registry's owner is a
    // contract, so the direct wrapper cannot work on this deployment.
    await expectReverted(fork, anyoneSdk.registry.updateVaultAddress(NEW_VAULT));
  }, 60_000);

  it("schedules, waits out the delay, and executes from an account with no role", async () => {
    const pa = proposerSdk.protocolAdmin;
    const registry = readRegistry(fork);

    const vaultBefore = (await registry.read.vault()) as Address;
    expect(vaultBefore).not.toBe(NEW_VAULT);

    const delay = await pa.getMinDelay();
    expect(delay).toBeGreaterThan(0n);

    const operation = await pa.proposer.schedule({
      address: F.REGISTRY,
      abi: Registry,
      functionName: "updateVaultAddress",
      args: [NEW_VAULT],
    });
    await fork.publicClient.waitForTransactionReceipt({ hash: operation.hash });

    // Waiting, not ready: the delay has not been served.
    expect(await pa.isOperationPending(operation.id)).toBe(true);
    expect(await pa.isOperationReady(operation.id)).toBe(false);
    expect(await pa.getOperationState(operation.id)).toBe(OperationState.Waiting);

    // Executing early is rejected outright.
    await expectReverted(fork, anyoneSdk.protocolAdmin.executor.execute(operation));

    await fork.testClient.increaseTime({ seconds: Number(delay) + 1 });
    await fork.testClient.mine({ blocks: 1 });

    expect(await pa.isOperationReady(operation.id)).toBe(true);
    expect(await pa.getOperationState(operation.id)).toBe(OperationState.Ready);

    // Execution is open, so the funded anvil account runs it.
    const executeHash = await anyoneSdk.protocolAdmin.executor.execute(operation);
    await fork.publicClient.waitForTransactionReceipt({ hash: executeHash });

    expect(await pa.isOperationDone(operation.id)).toBe(true);
    expect(await registry.read.vault()).toBe(NEW_VAULT);
  }, 180_000);

  it("a canceller drops a scheduled operation before it runs", async () => {
    const pa = proposerSdk.protocolAdmin;

    // A different salt, so this is its own operation rather than a reschedule.
    const salt = "0x00000000000000000000000000000000000000000000000000000000000000c1" as Hex;
    const operation = await pa.proposer.schedule(
      {
        address: F.REGISTRY,
        abi: Registry,
        functionName: "updateVaultAddress",
        args: [NEW_VAULT],
      },
      { salt },
    );
    await fork.publicClient.waitForTransactionReceipt({ hash: operation.hash });
    expect(await pa.isOperationPending(operation.id)).toBe(true);

    // Proposers carry CANCELLER_ROLE too, so the same client can cancel.
    const cancelHash = await pa.canceller.cancel(operation.id);
    await fork.publicClient.waitForTransactionReceipt({ hash: cancelHash });

    expect(await pa.isOperation(operation.id)).toBe(false);
    expect(await pa.getOperationState(operation.id)).toBe(OperationState.Unset);
  }, 180_000);

  it("a guardian suspends the admin key with no wait", async () => {
    const registry = readRegistry(fork);

    const adminBefore = (await registry.read.eSIMWalletAdmin()) as Address;
    expect(adminBefore).not.toBe("0x0000000000000000000000000000000000000000");

    const hash = await guardianSdk.protocolAdmin.guardian.disableAdminInstantly(F.REGISTRY);
    await fork.publicClient.waitForTransactionReceipt({ hash });

    // The suspended key stays on the books but stops answering as the admin.
    expect(await registry.read.eSIMWalletAdmin()).toBe("0x0000000000000000000000000000000000000000");
  }, 180_000);

  it("the guardian's instant powers are refused to everyone else", async () => {
    await expectReverted(fork, anyoneSdk.protocolAdmin.guardian.disableAdminInstantly(F.REGISTRY));
    await expectReverted(fork, anyoneSdk.protocolAdmin.guardian.unpauseInstantly(F.REGISTRY));
  }, 60_000);
});
