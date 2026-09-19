import { vi } from "vitest";
import { createWalletClient, http, parseEther, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const passkeyGet = vi.hoisted(() => vi.fn());
vi.mock("react-native-passkey", () => ({ Passkey: { get: passkeyGet } }));

import { KokioAdmin } from "kokio-sdk/admin";

import { impersonateRegistryOwner } from "../utils/forkChain.js";
import { describeUserFlow } from "./flows/userFlow.js";
import { startForkStack } from "./fixtures/forkStack.js";
import { setTokenBalance } from "./fixtures/tokens.js";
import { FORK_POLICY_ID } from "./fixtures/testLabels.js";

describeUserFlow("user flow on a Base Sepolia fork", async () => {
  const stack = await startForkStack();
  const waitFor = async (hash: Hex) => { await stack.fork.publicClient.waitForTransactionReceipt({ hash }); };

  // The backend signs with its own private key, as it would against a hosted RPC.
  // The registry owner hands it the admin role first.
  const account = privateKeyToAccount(generatePrivateKey());
  await stack.fork.testClient.setBalance({ address: account.address, value: parseEther("1") });
  const admin = new KokioAdmin(createWalletClient({ account, chain: baseSepolia, transport: http(stack.fork.rpcUrl) }));

  const { client: owner } = await impersonateRegistryOwner(stack.fork);
  await waitFor(await new KokioAdmin(owner).registry.requestAdminUpdate(account.address));
  await waitFor(await admin.registry.acceptAdminUpdate());

  return {
    rpcUrl: stack.fork.rpcUrl,
    publicClient: stack.fork.publicClient,
    pimlicoAPIKey: "unused-on-fork",
    policyId: FORK_POLICY_ID,
    bundlerUrl: stack.bundlerUrl,
    receiptUrl: stack.bundlerUrl,
    admin,
    fund: (token, to, amount) => setTokenBalance(stack.fork, token, to, amount),
    asset: "USDC",
    priceUSDCents: 500n,
    confirmations: 1,
    stop: stack.stop,
  };
}, passkeyGet, { timeout: 120_000 });
