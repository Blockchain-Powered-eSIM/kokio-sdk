import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { parseEventLogs, type Address } from "viem";

import { ProtocolAdmin, Registry } from "../../src/abis/index.js";
import { KokioAdmin } from "../../src/admin/config-admin.js";
import { ContractRevertError } from "../../src/logic/errors.js";
import { forkAvailable, impersonate, startFork, type Fork } from "../utils/forkChain.js";

// The mainnet guardian Safe, from `admin.guardians` in smart-contract-suite
// `deployments/base-8453-entrypoint-v8.json`.
const GUARDIAN: Address = "0x70fa7cA91e0Bd7781368115BD9bB6b79BDa4837d";

// Guardian instant pause on a Base mainnet fork, against the deployed ProtocolAdmin.
// Skips cleanly unless INTEGRATION=1 and Foundry is installed.
describe.skipIf(!forkAvailable())("guardian instant pause on a Base mainnet fork", () => {
  let fork: Fork;
  let guardian: KokioAdmin;
  let anyone: KokioAdmin;

  const paused = () =>
    fork.publicClient.readContract({ address: fork.addresses.REGISTRY, abi: Registry, functionName: "paused" });

  beforeAll(async () => {
    fork = await startFork(undefined, undefined, "base");
    guardian = new KokioAdmin(await impersonate(fork, GUARDIAN));
    // Holds no role on the timelock.
    anyone = new KokioAdmin(fork.funded);
  }, 60_000);

  afterAll(async () => {
    await fork?.stop();
  });

  it("pauses the registry with no wait and says who did it", async () => {
    expect(await paused()).toBe(false);

    const hash = await guardian.protocolAdmin.guardian.pauseInstantly(fork.addresses.REGISTRY);
    const receipt = await fork.publicClient.waitForTransactionReceipt({ hash });

    expect(await paused()).toBe(true);
    const [raised] = parseEventLogs({ abi: ProtocolAdmin, eventName: "PauseRaised", logs: receipt.logs });
    expect(raised.args).toEqual({ target: fork.addresses.REGISTRY, guardian: GUARDIAN });
  }, 60_000);

  it("releases it again with no wait", async () => {
    const hash = await guardian.protocolAdmin.guardian.unpauseInstantly(fork.addresses.REGISTRY);
    await fork.publicClient.waitForTransactionReceipt({ hash });

    expect(await paused()).toBe(false);
  }, 60_000);

  it("is refused to an account without the guardian role", async () => {
    const err = await anyone.protocolAdmin.guardian.pauseInstantly(fork.addresses.REGISTRY).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ContractRevertError);
    expect((err as ContractRevertError).decoded?.errorName).toBe("AccessControlUnauthorizedAccount");
  }, 60_000);
});
