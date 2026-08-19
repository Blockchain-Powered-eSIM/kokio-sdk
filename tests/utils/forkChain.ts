import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import {
  createPublicClient,
  createTestClient,
  createWalletClient,
  getContract,
  http,
  parseEther,
  type Address,
  type PublicClient,
  type TestClient,
  type WalletClient,
} from "viem";
import { baseSepolia } from "viem/chains";

import { DeviceWalletFactory, Registry } from "../../src/abis/index.js";
import { baseSepoliaFactoryAddresses } from "../../src/logic/constants.js";

// Local Base Sepolia fork harness for the opt-in scenario tier.
//
// Instead of writing to live Base Sepolia with real funded keys + a Pimlico
// bundler, each session spins up a local `anvil` fork. A fork carries the real
// deployed contracts and (via `--chain-id 84532`) reports the Base Sepolia chain
// id, so the SDK resolves the real factory addresses and runs unmodified. No
// secret keys are needed: `anvil` impersonates the real on-chain admin, and
// UserOps are submitted by a funded anvil account calling `EntryPoint.handleOps`
// directly (no external bundler).

// The public Base Sepolia endpoint the fork pulls state from when no RPC is configured.
const DEFAULT_FORK_RPC = "https://sepolia.base.org";

// HTTP request timeout for the fork clients. A fork fetches upstream state lazily,
// so a single write that touches many contracts or storage slots can spend well
// over viem's 10s default waiting on the (rate-limited) public endpoint. Give it
// room so those calls do not time out mid-execution.
const FORK_HTTP_TIMEOUT = 90_000;

// Shared transport options for every client bound to the fork.
const forkTransport = (rpcUrl: string) => http(rpcUrl, { timeout: FORK_HTTP_TIMEOUT });

/**
 * The `anvil` binary to run. Defaults to whatever is on PATH, overridable via
 * `ANVIL_BIN` - useful when a newer Foundry lives outside PATH (a recent anvil
 * is required so the fork serves the RIP-7212 P256 precompile at 0x100).
 */
export const getAnvilBin = (): string => process.env.ANVIL_BIN ?? "anvil";

/** True when the resolved `anvil` binary is runnable (Foundry installed). */
export const anvilInstalled = (): boolean => {
  try {
    return spawnSync(getAnvilBin(), ["--version"], { stdio: "ignore" }).status === 0;
  } catch {
    return false;
  }
};

/**
 * Gate for the whole fork tier: opt-in via INTEGRATION=1 AND Foundry present.
 * Keeps `npm test` / CI fully offline and green with no Foundry and no envs.
 */
export const forkAvailable = (): boolean => process.env.INTEGRATION === "1" && anvilInstalled();

/** The upstream RPC the fork pulls state from (public endpoint unless overridden). */
export const getForkUpstreamRpc = (): string => process.env.BASE_SEPOLIA_RPC_URL ?? DEFAULT_FORK_RPC;

export interface Fork {
  /** Local JSON-RPC URL of the anvil fork. */
  rpcUrl: string;
  /** Reads against the fork. */
  publicClient: PublicClient;
  /** anvil-mode client for impersonation / balance / mining cheatcodes. */
  testClient: TestClient;
  /** Pre-funded anvil dev account (private-key signer) for arbitrary writes. */
  funded: WalletClient;
  /** Stop the fork and release the port. */
  stop: () => Promise<void>;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Spawn an anvil fork of Base Sepolia and wait until its RPC answers. The chain
 * id is pinned to 84532 so the SDK treats it as Base Sepolia while serving the
 * forked state.
 */
export const startFork = async (port = 8545): Promise<Fork> => {
  const upstream = getForkUpstreamRpc();
  const rpcUrl = `http://127.0.0.1:${port}`;
  const publicClient = createPublicClient({ chain: baseSepolia, transport: forkTransport(rpcUrl) });

  // anvil reads upstream state to build its genesis, so a rate-limited or
  // briefly unhealthy endpoint makes it exit before it ever serves a request.
  // That is transient, and each suite in the tier starts its own fork, so one
  // retry is what keeps a run from failing on someone else's traffic.
  const attempt = async (): Promise<ChildProcess | null> => {
    const proc: ChildProcess = spawn(
      getAnvilBin(),
      ["--fork-url", upstream, "--port", String(port), "--chain-id", "84532", "--silent"],
      { stdio: "ignore" },
    );

    let exited = false;
    proc.once("exit", () => { exited = true; });

    const deadline = Date.now() + 30_000;
    for (;;) {
      try {
        if ((await publicClient.getChainId()) === baseSepolia.id) return proc;
      } catch {
        // not up yet
      }
      // Nothing to wait for once the process is gone: anvil gave up on upstream.
      if (exited) return null;
      if (Date.now() > deadline) {
        proc.kill("SIGKILL");
        return null;
      }
      await sleep(250);
    }
  };

  let proc = await attempt();
  if (!proc) {
    await sleep(5_000);
    proc = await attempt();
  }
  if (!proc) throw new Error(`anvil fork did not become ready within 30s (upstream: ${upstream})`);

  const testClient = createTestClient({ chain: baseSepolia, mode: "anvil", transport: forkTransport(rpcUrl) });

  // anvil's first default account, deterministic across runs.
  const FUNDED_PK = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as const;
  const { privateKeyToAccount } = await import("viem/accounts");
  const funded = createWalletClient({
    account: privateKeyToAccount(FUNDED_PK),
    chain: baseSepolia,
    transport: forkTransport(rpcUrl),
  });

  const stop = async () => {
    proc.kill("SIGTERM");
    // Give the process a beat to release the port before the next suite.
    await sleep(200);
  };

  return { rpcUrl, publicClient, testClient, funded, stop };
};

/**
 * Fund an address and return a wallet client that acts as it, so gated writes
 * succeed with no private key. The client's `account` is a bare JSON-RPC address,
 * so the SDK's `writeContract` routes through `eth_sendTransaction` (anvil signs
 * it). Works for contract addresses too, which is how the owner is reached.
 */
export const impersonate = async (fork: Fork, address: Address): Promise<WalletClient> => {
  await fork.testClient.impersonateAccount({ address });
  await fork.testClient.setBalance({ address, value: parseEther("100") });

  return createWalletClient({
    account: address,
    chain: baseSepolia,
    transport: forkTransport(fork.rpcUrl),
  });
};

/** Impersonate the factory's real on-chain `eSIMWalletAdmin`. */
export const impersonateAdmin = async (fork: Fork): Promise<{ admin: Address; client: WalletClient }> => {
  const factory = getContract({
    abi: DeviceWalletFactory,
    address: baseSepoliaFactoryAddresses.DEVICE_WALLET_FACTORY,
    client: fork.publicClient,
  });

  const admin = (await factory.read.eSIMWalletAdmin()) as Address;

  return { admin, client: await impersonate(fork, admin) };
};

/**
 * Impersonate the registry's owner, which holds admin rotation and the vault
 * setter. On the live deployment this is the ProtocolAdmin contract, so the
 * calls it makes here skip that contract's own scheduling.
 */
export const impersonateRegistryOwner = async (fork: Fork): Promise<{ owner: Address; client: WalletClient }> => {
  const registry = getContract({
    abi: Registry,
    address: baseSepoliaFactoryAddresses.REGISTRY,
    client: fork.publicClient,
  });

  const owner = (await registry.read.owner()) as Address;

  return { owner, client: await impersonate(fork, owner) };
};
