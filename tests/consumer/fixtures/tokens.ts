import { encodeAbiParameters, erc20Abi, keccak256, toHex, type Address } from "viem";

import type { Fork } from "../../utils/forkChain.js";

// Give `holder` exactly `amount` of `token` on the fork by writing its balance
// slot. The slot index of the balances mapping differs per token, so this tries
// the usual ones and keeps the first that `balanceOf` reports back.
export const setTokenBalance = async (fork: Fork, token: Address, holder: Address, amount: bigint) => {
  const readBalance = () => fork.publicClient.readContract({
    address: token, abi: erc20Abi, functionName: "balanceOf", args: [holder],
  });

  for (let index = 0n; index < 20n; index++) {
    const slot = keccak256(encodeAbiParameters([{ type: "address" }, { type: "uint256" }], [holder, index]));
    const previous = await fork.publicClient.getStorageAt({ address: token, slot });

    await fork.testClient.setStorageAt({ address: token, index: slot, value: toHex(amount, { size: 32 }) });
    if ((await readBalance()) === amount) return;

    await fork.testClient.setStorageAt({ address: token, index: slot, value: previous ?? toHex(0n, { size: 32 }) });
  }

  throw new Error(`no balance slot found for ${token}`);
};
