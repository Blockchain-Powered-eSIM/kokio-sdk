// Loaded here rather than per suite: every fork test reaches the chain through
// this module, and a missing BASE_SEPOLIA_RPC_URL silently falls back to the
// public endpoint, which is rate limited enough to fail the fork on startup.
import "dotenv/config";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import {
  createPublicClient,
  createTestClient,
  createWalletClient,
  getContract,
  http,
  parseEther,
  type Address,
  type Hex,
  type PublicClient,
  type TestClient,
  type WalletClient,
} from "viem";
import { base, baseSepolia } from "viem/chains";

import { DeviceWalletFactory, Registry } from "../../src/abis/index.js";
import { baseMainnetFactoryAddresses, baseSepoliaFactoryAddresses } from "../../src/logic/constants.js";
import type { KokioSmartAccountClient } from "../../src/types.js";

// Local Base Sepolia or Base mainnet fork harness for the opt-in scenario tier.
//
// Instead of writing to a live chain with real funded keys + a Pimlico
// bundler, each session spins up a local `anvil` fork. A fork carries the real
// deployed contracts and reports the forked chain's own id, so the SDK
// resolves the real factory addresses and runs unmodified. No
// secret keys are needed: `anvil` impersonates the real on-chain admin, and
// UserOps are submitted by a funded anvil account calling `EntryPoint.handleOps`
// directly (no external bundler).

export type ForkNetwork = "base-sepolia" | "base";

// Base mainnet is pinned past its deployment block (52,814,249), so the fork
// carries the current contracts. Base Sepolia stays on its older pin until its
// upgrade lands.
const NETWORKS = {
  "base-sepolia": {
    chain: baseSepolia,
    addresses: baseSepoliaFactoryAddresses,
    upstream: () => process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org",
    block: 46_990_000n,
  },
  base: {
    chain: base,
    addresses: baseMainnetFactoryAddresses,
    upstream: () => process.env.BASE_MAINNET_RPC_URL ?? "https://mainnet.base.org",
    block: 52_817_000n,
  },
} as const;

// HTTP request timeout for the fork clients. A fork fetches upstream state lazily,
// so a single write that touches many contracts or storage slots can spend well
// over viem's 10s default waiting on the (rate-limited) public endpoint. Give it
// room so those calls do not time out mid-execution.
const FORK_HTTP_TIMEOUT = 90_000;

// Shared transport options for every client bound to the fork.
const forkTransport = (rpcUrl: string) => http(rpcUrl, { timeout: FORK_HTTP_TIMEOUT });

/**
 * The `anvil` binary to run. Defaults to whatever is on PATH, overridable via
 * `ANVIL_BIN` - useful when a newer Foundry lives outside PATH.
 */
export const getAnvilBin = (): string => process.env.ANVIL_BIN ?? "anvil";

// Base Sepolia answers at 0x100, so signature verification there runs the RIP-7212
// precompile and never reaches the FreshCryptoLib fallback. A fork does not inherit
// that: anvil decides its own precompile set from the hardfork, and on the default
// it serves nothing at 0x100, so every P256 verification silently takes the fallback
// and costs about 30x what production costs. Pinning `osaka` puts the precompile back
// and is what makes a fork measurement mean anything.
const FORK_HARDFORK = "osaka";

/** True when the resolved `anvil` binary is runnable (Foundry installed). */
export const anvilInstalled = (): boolean => {
  try {
    return spawnSync(getAnvilBin(), ["--version"], { stdio: "ignore" }).status === 0;
  } catch {
    return false;
  }
};

/**
 * Gate for the whole fork tier, opted into with INTEGRATION=1. Keeps `npm test`
 * offline. Asking for the tier without Foundry is an error rather than a skip,
 * so a run that tested nothing cannot pass as green.
 */
export const forkAvailable = (): boolean => {
  if (process.env.INTEGRATION !== "1") return false;
  if (!anvilInstalled()) throw new Error(`INTEGRATION=1 but "${getAnvilBin()}" is not runnable. Install Foundry or set ANVIL_BIN.`);
  return true;
};

/** Block every Base Sepolia fork starts from, so each run sees the same contract state. */
export const FORK_BLOCK = NETWORKS["base-sepolia"].block;

/** A port nothing is listening on, so suites never collide. */
export const freePort = (): Promise<number> =>
  new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as { port: number };
      server.close(() => resolve(port));
    });
  });

/** The upstream RPC the fork pulls state from (public endpoint unless overridden). */
export const getForkUpstreamRpc = (network: ForkNetwork = "base-sepolia"): string => NETWORKS[network].upstream();

export interface Fork {
  /** Local JSON-RPC URL of the anvil fork. */
  rpcUrl: string;
  /** The chain the fork reports, so the SDK resolves that chain's addresses. */
  chain: typeof base | typeof baseSepolia;
  /** The SDK's address book for that chain. */
  addresses: Record<string, Address>;
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
 * Spawn an anvil fork of `network` and wait until its RPC answers. The chain id
 * is pinned to the network's own so the SDK resolves its real addresses.
 */
export const startFork = async (
  port?: number,
  blockNumber?: bigint,
  network: ForkNetwork = "base-sepolia",
): Promise<Fork> => {
  port ??= await freePort();
  const { chain, addresses } = NETWORKS[network];
  blockNumber ??= NETWORKS[network].block;
  const upstream = getForkUpstreamRpc(network);
  const rpcUrl = `http://127.0.0.1:${port}`;
  const publicClient = createPublicClient({ chain, transport: forkTransport(rpcUrl) });

  // anvil reads upstream state to build its genesis, so a rate-limited or
  // briefly unhealthy endpoint makes it exit before it ever serves a request.
  // That is transient, and each suite in the tier starts its own fork, so one
  // retry is what keeps a run from failing on someone else's traffic.
  const attempt = async (): Promise<ChildProcess | null> => {
    const proc: ChildProcess = spawn(
      getAnvilBin(),
      [
        "--fork-url", upstream,
        "--fork-block-number", String(blockNumber),
        "--port", String(port),
        "--chain-id", String(chain.id),
        "--hardfork", FORK_HARDFORK,
        "--silent",
      ],
      { stdio: "ignore" },
    );

    let exited = false;
    proc.once("exit", () => { exited = true; });

    const deadline = Date.now() + 30_000;
    for (;;) {
      try {
        if ((await publicClient.getChainId()) === chain.id) return proc;
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

  const testClient = createTestClient({ chain, mode: "anvil", transport: forkTransport(rpcUrl) });

  // The pinned block is older than the wall clock, while signatures carry a
  // wall-clock expiry as they do on a phone. Bring the chain up to now.
  await testClient.setNextBlockTimestamp({ timestamp: BigInt(Math.floor(Date.now() / 1000)) });
  await testClient.mine({ blocks: 1 });

  // anvil's first default account, deterministic across runs.
  const FUNDED_PK = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as const;
  const { privateKeyToAccount } = await import("viem/accounts");
  const funded = createWalletClient({
    account: privateKeyToAccount(FUNDED_PK),
    chain,
    transport: forkTransport(rpcUrl),
  });

  const stop = async () => {
    proc.kill("SIGTERM");
    // Give the process a beat to release the port before the next suite.
    await sleep(200);
  };

  return { rpcUrl, chain, addresses, publicClient, testClient, funded, stop };
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
    chain: fork.chain,
    transport: forkTransport(fork.rpcUrl),
  });
};

/**
 * A stand-in smart account client that runs each call of a "user operation" as
 * a plain transaction from the impersonated device wallet. At the target that is
 * what `execute` produces (`msg.sender` is the wallet), so SDK user-operation
 * helpers can be driven on a fork without a bundler or a passkey.
 */
export const impersonatedSmartAccount = async (fork: Fork, wallet: Address): Promise<KokioSmartAccountClient> => {
  const sender = await impersonate(fork, wallet);

  return {
    account: { address: wallet },
    chain: fork.chain,
    transport: { url: fork.rpcUrl },
    getChainId: () => fork.publicClient.getChainId(),
    readContract: (args: Parameters<PublicClient["readContract"]>[0]) => fork.publicClient.readContract(args),
    sendUserOperation: async ({ calls }: { calls: readonly { to: Address; data?: Hex; value?: bigint }[] }) => {
      let hash: Hex = "0x";
      for (const call of calls) {
        hash = await sender.sendTransaction({ account: wallet, chain: fork.chain, to: call.to, data: call.data, value: call.value });
        const receipt = await fork.publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== "success") throw new Error(`call to ${call.to} reverted in ${hash}`);
      }
      return hash;
    },
  } as unknown as KokioSmartAccountClient;
};

/** Impersonate the factory's real on-chain `eSIMWalletAdmin`. */
export const impersonateAdmin = async (fork: Fork): Promise<{ admin: Address; client: WalletClient }> => {
  const factory = getContract({
    abi: DeviceWalletFactory,
    address: fork.addresses.DEVICE_WALLET_FACTORY,
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
    address: fork.addresses.REGISTRY,
    client: fork.publicClient,
  });

  const owner = (await registry.read.owner()) as Address;

  return { owner, client: await impersonate(fork, owner) };
};
