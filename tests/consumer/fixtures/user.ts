import type { Mock } from "vitest";
import { createWalletClient, http, type Address } from "viem";
import { baseSepolia } from "viem/chains";
import { Kokio } from "kokio-sdk";
import type { KokioSmartAccount, KokioSmartAccountClient } from "kokio-sdk/types";

import { createSoftSigner, type SoftSigner } from "../../utils/softP256Signer.js";
import { asPasskey } from "./passkeyAuthenticator.js";
import type { ForkStack } from "./forkStack.js";
import { CREDENTIAL_ID, FORK_POLICY_ID, RP_ID, testDeviceId } from "./testLabels.js";

export interface TestUser {
  uid: string;
  salt: bigint;
  signer: SoftSigner;
  account: KokioSmartAccount;
  client: KokioSmartAccountClient;
  /** Built with the smart account client and the device wallet, as an app does after setup. */
  kokio: Kokio;
  deviceWallet: Address;
}

/** Where a test user's wallet lives: a fork with local stand-ins, or Base Sepolia with Pimlico. */
export interface UserTarget {
  rpcUrl: string;
  /** Left out to use Pimlico, as an app does. */
  bundlerUrl?: string;
  pimlicoAPIKey: string;
  policyId: string;
}

export const forkTarget = (stack: ForkStack): UserTarget => ({
  rpcUrl: stack.fork.rpcUrl,
  bundlerUrl: stack.bundlerUrl,
  pimlicoAPIKey: "unused-on-fork",
  policyId: FORK_POLICY_ID,
});

// What an app does when a user first opens it: a passkey, a wallet client with
// no account, the counterfactual smart account and its bundler client. Nothing is
// deployed yet. `passkeyGet` is the suite's mocked `Passkey.get`, pointed at this
// user's key.
export const createTestUser = async (target: UserTarget, passkeyGet: Mock): Promise<TestUser> => {
  const uid = testDeviceId();
  const salt = BigInt(Date.now());
  const signer = createSoftSigner(RP_ID);
  passkeyGet.mockImplementation(asPasskey(signer));

  const walletClient = createWalletClient({ chain: baseSepolia, transport: http(target.rpcUrl) });

  const setup = new Kokio(walletClient, CREDENTIAL_ID, RP_ID, target.pimlicoAPIKey, target.policyId);
  const account = await setup.smartAccount.getSmartWallet(uid, signer.ownerKey, salt);
  const client = await setup.smartAccount.getSmartWalletClient(account, { bundlerUrl: target.bundlerUrl });
  const kokio = new Kokio(walletClient, CREDENTIAL_ID, RP_ID, target.pimlicoAPIKey, target.policyId, client, account.address);

  return { uid, salt, signer, account, client, kokio, deviceWallet: account.address };
};
