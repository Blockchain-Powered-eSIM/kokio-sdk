import { describe, it, expect, vi } from "vitest";
import { encodeFunctionData, erc20Abi, type Address, type Hex } from "viem";

import { makeMockSmartAccountClient, makeMockWalletClient } from "../../utils/mockClient.js";
import { baseSepoliaFactoryAddresses } from "../../../src/logic/constants.js";
import { ESIMWallet } from "../../../src/abis/index.js";
import { Settlement, type DataBundleDetails } from "../../../src/types.js";
import { _buyDataBundleWithTransferCalls, type CallBuilderClient } from "../../../src/logic/calls/eSIMWallet.calls.js";
import { _buyDataBundleWithTransfer } from "../../../src/logic/eSIMWallet.js";

const ESIM = "0x00000000000000000000000000000000000e51a1" as Address;
const ADAPTER = "0x00000000000000000000000000000000000ada91" as Address;
const TOKEN = "0x0000000000000000000000000000000000706b31" as Address;
const BUNDLE: DataBundleDetails = {
  id: "0x0000000000000000000000000000000000000000000000000000000000000001",
  priceUSDCents: 1000n,
  settlement: Settlement.DeviceWallet,
};
const ASSET = "0x5553444300000000000000000000000000000000000000000000000000000000" as Hex;
const REF = "0x000000000000000000000000000000000000000000000000000000000000ee11" as Hex;
const QUOTE = 100n;
const MAX_IN = 120n;

const BUY = {
  to: ESIM,
  data: encodeFunctionData({ abi: ESIMWallet, functionName: "buyDataBundleWithToken", args: [BUNDLE, ASSET, MAX_IN, REF] }),
};
const transfer = (amount: bigint) => ({
  to: TOKEN,
  data: encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [ESIM, amount] }),
});

const reads = (held: bigint) => ({ paymentAdapter: ADAPTER, resolveAsset: { token: TOKEN }, quote: QUOTE, balanceOf: held });

// The builder takes any client that reads, so the admin wallet client stands in.
const builderClient = (held: bigint) => makeMockWalletClient({ chainId: 84532, reads: reads(held) }) as unknown as CallBuilderClient;
const build = (client: CallBuilderClient) => _buyDataBundleWithTransferCalls(client, ESIM, BUNDLE, ASSET, MAX_IN, REF);

describe("_buyDataBundleWithTransferCalls", () => {
  it("sends only the shortfall before the purchase", async () => {
    expect(await build(builderClient(30n))).toEqual([transfer(70n), BUY]);
  });

  it("skips the transfer when the eSIM wallet already holds the quote", async () => {
    expect(await build(builderClient(QUOTE))).toEqual([BUY]);
    expect(await build(builderClient(QUOTE + 1n))).toEqual([BUY]);
  });

  it("sends the whole quote to an empty eSIM wallet", async () => {
    expect(await build(builderClient(0n))).toEqual([transfer(QUOTE), BUY]);
  });

  it("reads the adapter from the registry, then the eSIM wallet's balance of the resolved token", async () => {
    const client = builderClient(0n);
    await build(client);

    const read = client.readContract as unknown as ReturnType<typeof vi.fn>;
    const calls = read.mock.calls.map(([arg]) => arg);
    expect(calls.find((c) => c.functionName === "paymentAdapter").address).toBe(baseSepoliaFactoryAddresses.REGISTRY);
    expect(calls.find((c) => c.functionName === "resolveAsset")).toMatchObject({ address: ADAPTER, args: [ASSET] });
    expect(calls.find((c) => c.functionName === "quote")).toMatchObject({ address: ADAPTER, args: [ASSET, BUNDLE.priceUSDCents] });
    expect(calls.find((c) => c.functionName === "balanceOf")).toMatchObject({ address: TOKEN, args: [ESIM] });
  });
});

describe("eSIMWallet._buyDataBundleWithTransfer", () => {
  it("sends the built calls as one user operation", async () => {
    const client = makeMockSmartAccountClient({ reads: reads(30n) });
    await _buyDataBundleWithTransfer(client, ESIM, BUNDLE, ASSET, MAX_IN, REF);

    const send = client.sendUserOperation as unknown as ReturnType<typeof vi.fn>;
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toEqual({ account: client.account, calls: [transfer(70n), BUY] });
  });

  it("throws MISSING_SMART_WALLET before reading anything", async () => {
    const client = makeMockSmartAccountClient({ withAccount: false, reads: reads(0n) });
    await expect(_buyDataBundleWithTransfer(client, ESIM, BUNDLE, ASSET, MAX_IN, REF)).rejects.toThrow(/smart wallet/i);
    expect(client.readContract).not.toHaveBeenCalled();
  });
});
