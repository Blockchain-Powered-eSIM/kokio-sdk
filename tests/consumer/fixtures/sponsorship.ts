import { expect } from "vitest";
import { zeroAddress, type Address, type Hex, type PublicClient } from "viem";
import type { KokioSmartAccountClient } from "kokio-sdk/types";

const ENTRY_POINT_08 = "0x4337084D9E255Ff0702461CF8895CE9E3b5Ff108";
const balanceOfAbi = [{
  type: "function", name: "balanceOf", stateMutability: "view",
  inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }],
}] as const;

const spendable = async (reader: PublicClient, sender: Address) => ({
  eth: await reader.getBalance({ address: sender }),
  deposit: await reader.readContract({ address: ENTRY_POINT_08, abi: balanceOfAbi, functionName: "balanceOf", args: [sender] }),
});

/**
 * Run `send`, wait for its user operation, and check it succeeded with a paymaster
 * covering gas: the sender's ETH and EntryPoint deposit are both unchanged, which
 * an operation it paid for itself cannot manage.
 */
export const expectSponsored = async (
  client: KokioSmartAccountClient,
  reader: PublicClient,
  send: () => Promise<Hex>,
) => {
  const sender = client.account!.address;
  const before = await spendable(reader, sender);

  const hash = await send();
  const receipt = await client.waitForUserOperationReceipt({ hash, timeout: 120_000 });

  expect(receipt.success, `user operation ${hash} reverted`).toBe(true);
  expect(receipt.paymaster).not.toBe(zeroAddress);
  expect(await reader.getCode({ address: receipt.paymaster! })).toMatch(/^0x[0-9a-f]+$/i);
  expect(await spendable(reader, sender)).toEqual(before);

  return receipt;
};
