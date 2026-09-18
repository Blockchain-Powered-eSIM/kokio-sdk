// The live tier reads its keys from the environment, loaded here from .env the
// same way the fork harness does.
import "dotenv/config";
import { createPublicClient, createWalletClient, erc20Abi, http, type Address, type Hex, type PublicClient, type WalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { KokioAdmin } from "kokio-sdk/admin";

import type { UserTarget } from "./user.js";

export interface LiveStack {
  target: UserTarget;
  publicClient: PublicClient;
  /** The backend: the registry's eSIM wallet admin, signing with its own key. */
  admin: KokioAdmin;
  adminClient: WalletClient;
}

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set. The live tier needs it; see TEST_PLAN.md.`);
  return value;
};

/** Build the live clients, and check the admin key is the one the registry trusts. */
export const startLiveStack = async (): Promise<LiveStack> => {
  const rpcUrl = required("BASE_SEPOLIA_RPC_URL");
  const target: UserTarget = {
    rpcUrl,
    pimlicoAPIKey: required("PIMLICO_API_SECRET"),
    // Optional: Pimlico sponsors without a policy.
    policyId: process.env.PIMLICO_POLICY_ID ?? "",
  };

  // Cast because viem types an OP Stack client's blocks more narrowly than the generic one.
  const publicClient = createPublicClient({ chain: baseSepolia, transport: http(rpcUrl) }) as PublicClient;
  const adminClient = createWalletClient({
    account: privateKeyToAccount(required("ESIM_WALLET_ADMIN_PK") as Hex),
    chain: baseSepolia,
    transport: http(rpcUrl),
  });
  const admin = new KokioAdmin(adminClient);

  const onRecord = await admin.registry.eSIMWalletAdmin();
  if (onRecord !== adminClient.account!.address) {
    throw new Error(`ESIM_WALLET_ADMIN_PK is ${adminClient.account!.address}, but the registry's admin is ${onRecord}.`);
  }

  return { target, publicClient, admin, adminClient };
};

/** Send `amount` of `token` from the admin to `to`, after checking the admin holds it. */
export const fundFromAdmin = async (live: LiveStack, token: Address, to: Address, amount: bigint) => {
  const from = live.adminClient.account!.address;
  const held = await live.publicClient.readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [from] });
  if (held < amount) {
    // The token is whatever the adapter resolves the asset to, so name it rather than guess a faucet.
    throw new Error(`The admin ${from} holds ${held} of ${token} and the purchase needs ${amount}. Send it some of that token.`);
  }

  const hash = await live.adminClient.writeContract({
    address: token, abi: erc20Abi, functionName: "transfer", args: [to, amount],
    account: live.adminClient.account!, chain: baseSepolia,
  });
  await live.publicClient.waitForTransactionReceipt({ hash });
};
