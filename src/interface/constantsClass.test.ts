import { describe, it, expect, vi } from "vitest";
import type { WalletClient } from "viem";
import { ConstantsSubPackage } from "./constantsClass.js";
import { sepoliaFactoryAddresses, CHAIN_ID } from "../logic/constants.js";

const makeClient = (chainId: number) => {
  const getChainId = vi.fn(async () => chainId);
  const client = {
    getChainId,
    transport: { url: "https://rpc.test.invalid" },
  } as unknown as WalletClient;
  return { client, getChainId };
};

describe("ConstantsSubPackage.load()", () => {
  it("resolves chain-specific constants for the connected chain", async () => {
    const { client } = makeClient(CHAIN_ID.SEPOLIA);
    const constants = await new ConstantsSubPackage(client, "KEY").load();

    expect(constants.factoryAddresses).toBe(sepoliaFactoryAddresses);
    expect(constants.pimlicoRpcURL).toContain("apikey=KEY");
  });

  it("memoizes: the chain id is fetched only once across repeated loads", async () => {
    const { client, getChainId } = makeClient(CHAIN_ID.SEPOLIA);
    const pkg = new ConstantsSubPackage(client, "KEY");

    const a = await pkg.load();
    const b = await pkg.load();

    expect(getChainId).toHaveBeenCalledTimes(1);
    expect(a).toBe(b); // same resolved object, not a re-computed copy
  });
});
