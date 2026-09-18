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

// What an app does when a user first opens it: a passkey, a wallet client with
// no account, the counterfactual smart account and its bundler client. Nothing is
// deployed yet. `passkeyGet` is the suite's mocked `Passkey.get`, pointed at this
// user's key.
export const createTestUser = async (stack: ForkStack, passkeyGet: Mock): Promise<TestUser> => {
  const uid = testDeviceId();
  const salt = BigInt(Date.now());
  const signer = createSoftSigner(RP_ID);
  passkeyGet.mockImplementation(asPasskey(signer));

  const walletClient = createWalletClient({ chain: baseSepolia, transport: http(stack.fork.rpcUrl) });

  const setup = new Kokio(walletClient, CREDENTIAL_ID, RP_ID, "unused-on-fork", FORK_POLICY_ID);
  const account = await setup.smartAccount.getSmartWallet(uid, signer.ownerKey, salt);
  const client = await setup.smartAccount.getSmartWalletClient(account, { bundlerUrl: stack.bundlerUrl });
  const kokio = new Kokio(walletClient, CREDENTIAL_ID, RP_ID, "unused-on-fork", FORK_POLICY_ID, client, account.address);

  return { uid, salt, signer, account, client, kokio, deviceWallet: account.address };
};
