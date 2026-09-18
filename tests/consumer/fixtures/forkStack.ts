import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { paymaster } from "@pimlico/mock-paymaster";

import { startFork, type Fork } from "../../utils/forkChain.js";

// A local stand-in for Pimlico: an anvil fork of Base Sepolia, an Alto bundler on
// it, and the mock paymaster in front of Alto. The mock paymaster answers the
// ERC-7677 methods and forwards every bundler method to Alto, so one URL serves
// both roles, as api.pimlico.io does.

// Pinned so every run sees the same contract state. Live reads at this height
// are recorded in TEST_PROGRESS.md.
export const FORK_BLOCK = 46_990_000n;

const ENTRY_POINT_08 = "0x4337084D9E255Ff0702461CF8895CE9E3b5Ff108";

// anvil dev accounts 1 and 2, funded on every fork. Account 0 is the fork's own
// `funded` client, so the bundler never races the test for a nonce.
const EXECUTOR_PK = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const UTILITY_PK = "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a";

const ALTO_CLI = fileURLToPath(new URL("../../../node_modules/@pimlico/alto/esm/cli/alto.js", import.meta.url));

export interface ForkStack {
  fork: Fork;
  /** Bundler and paymaster endpoint, passed to `getSmartWalletClient`. */
  bundlerUrl: string;
  stop: () => Promise<void>;
}

const freePort = (): Promise<number> =>
  new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as { port: number };
      server.close(() => resolve(port));
    });
  });

const answersRpc = async (url: string): Promise<boolean> => {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_supportedEntryPoints", params: [] }),
    });
    return res.ok;
  } catch {
    return false;
  }
};

const startAlto = async (rpcUrl: string, port: number): Promise<ChildProcess> => {
  // Alto loads a .env from its working directory on start. Run it from an empty
  // temp directory with dotenv pointed at nothing, so it only sees these flags.
  const proc = spawn(
    process.execPath,
    [
      ALTO_CLI,
      "--entrypoints", ENTRY_POINT_08,
      "--rpc-url", rpcUrl,
      "--executor-private-keys", EXECUTOR_PK,
      "--utility-private-key", UTILITY_PK,
      "--port", String(port),
      // Safe mode needs a tracer anvil does not provide.
      "--safe-mode", "false",
      "--log-level", "warn",
    ],
    {
      cwd: mkdtempSync(join(tmpdir(), "kokio-alto-")),
      env: { ...process.env, DOTENV_CONFIG_PATH: "/dev/null" },
      stdio: ["ignore", "ignore", "pipe"],
    },
  );

  let stderr = "";
  proc.stderr?.on("data", (chunk) => { stderr += chunk; });

  const url = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 60_000;
  while (!(await answersRpc(url))) {
    if (proc.exitCode !== null || Date.now() > deadline) {
      proc.kill("SIGKILL");
      throw new Error(`Alto did not start on ${url}:\n${stderr}`);
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  return proc;
};

/** Start the fork, bundler and paymaster. Throws if any of them cannot start. */
export const startForkStack = async (): Promise<ForkStack> => {
  const [anvilPort, altoPort, paymasterPort] = await Promise.all([freePort(), freePort(), freePort()]);

  const fork = await startFork(anvilPort, FORK_BLOCK);
  const alto = await startAlto(fork.rpcUrl, altoPort);

  const pm = paymaster({
    anvilRpc: fork.rpcUrl,
    altoRpc: `http://127.0.0.1:${altoPort}`,
    port: paymasterPort,
    host: "127.0.0.1",
  });
  await pm.start();

  return {
    fork,
    bundlerUrl: `http://127.0.0.1:${paymasterPort}`,
    stop: async () => {
      await pm.stop();
      alto.kill("SIGTERM");
      await fork.stop();
    },
  };
};
