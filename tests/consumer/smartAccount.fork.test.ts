import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { hashMessage, type TypedDataDefinition } from "viem";

const passkeyGet = vi.hoisted(() => vi.fn());
vi.mock("react-native-passkey", () => ({ Passkey: { get: passkeyGet } }));

import { asPasskey } from "./fixtures/passkeyAuthenticator.js";
import { expectSponsored } from "./fixtures/sponsorship.js";
import { startForkStack, type ForkStack } from "./fixtures/forkStack.js";
import { TEST_TAG } from "./fixtures/testLabels.js";
import { createTestUser } from "./fixtures/user.js";

const ERC1271_MAGIC = "0x1626ba7e";
const MESSAGE = `${TEST_TAG}: sign in`;
const TYPED_DATA: TypedDataDefinition = {
  domain: { name: TEST_TAG, version: "1", chainId: 84532 },
  types: { Login: [{ name: "user", type: "string" }] },
  primaryType: "Login",
  message: { user: TEST_TAG },
};

// Smart account behaviour an app relies on beyond the purchase flow: what real
// authenticators hand back, and signatures for sign-in style flows.
describe("smart account on a Base Sepolia fork", () => {
  let stack: ForkStack;

  beforeAll(async () => {
    stack = await startForkStack();
  }, 180_000);

  afterAll(async () => {
    await stack?.stop();
  });

  it("accepts an authenticator signature with a high s", async () => {
    const user = await createTestUser(stack, passkeyGet);
    passkeyGet.mockImplementation(asPasskey(user.signer, { highS: true }));

    await expectSponsored(user.client, stack.fork.publicClient, () => user.kokio.deviceWallet!.sendUserOperation([]));
  }, 120_000);

  it("signs messages and typed data that verify before and after the wallet is deployed", async () => {
    const user = await createTestUser(stack, passkeyGet);
    const verify = async () => {
      const [message, typed] = await Promise.all([
        stack.fork.publicClient.verifyMessage({
          address: user.deviceWallet, message: MESSAGE, signature: await user.account.signMessage({ message: MESSAGE }),
        }),
        stack.fork.publicClient.verifyTypedData({
          address: user.deviceWallet, ...TYPED_DATA, signature: await user.account.signTypedData(TYPED_DATA),
        } as never),
      ]);
      return { message, typed };
    };

    // Not deployed yet, so the signature has to carry the deployment (ERC-6492).
    expect(await verify()).toEqual({ message: true, typed: true });

    await expectSponsored(user.client, stack.fork.publicClient, () => user.kokio.deviceWallet!.sendUserOperation([]));

    expect(await verify()).toEqual({ message: true, typed: true });
    const signature = await user.account.signMessage({ message: MESSAGE });
    expect(await user.kokio.deviceWallet!.isValidSignature(hashMessage(MESSAGE), signature)).toBe(ERC1271_MAGIC);
  }, 120_000);

  it("refuses a message signature made by another passkey", async () => {
    const user = await createTestUser(stack, passkeyGet);
    await expectSponsored(user.client, stack.fork.publicClient, () => user.kokio.deviceWallet!.sendUserOperation([]));

    // Creating a second user points the passkey prompt at that user's key, so
    // this signature comes from a key the first wallet does not know.
    await createTestUser(stack, passkeyGet);
    const signature = await user.account.signMessage({ message: MESSAGE });

    expect(await stack.fork.publicClient.verifyMessage({ address: user.deviceWallet, message: MESSAGE, signature })).toBe(false);
  }, 120_000);
});
