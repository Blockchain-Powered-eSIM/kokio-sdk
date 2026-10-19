import { describe, it, expect, vi } from "vitest";
import { getAddress } from "viem";
import { base, baseSepolia } from "viem/chains";
import {
  _chainId,
  _getChainSpecificConstants,
  CHAIN_ID,
  baseMainnetFactoryAddresses,
  baseSepoliaFactoryAddresses,
} from "../../src/logic/constants.js";

const RPC = "https://rpc.test.invalid";

describe("_getChainSpecificConstants - configured chains", () => {
  it("maps base mainnet to its factory addresses + chain", () => {
    const v = _getChainSpecificConstants(CHAIN_ID.BASE_MAINNET, RPC);
    expect(v.factoryAddresses).toBe(baseMainnetFactoryAddresses);
    expect(v.chain).toBe(base);
    for (const address of Object.values(v.factoryAddresses)) {
      expect(getAddress(address)).toBe(address);
    }
  });

  it("maps base-sepolia to its factory addresses + chain", () => {
    const v = _getChainSpecificConstants(CHAIN_ID.BASE_SEPOLIA, RPC);
    expect(v.factoryAddresses).toBe(baseSepoliaFactoryAddresses);
    expect(v.chain).toBe(baseSepolia);
    expect(v.rpcURL).toBe(RPC);
  });

  it("builds the pimlico RPC URL only when an API key is supplied", () => {
    expect(_getChainSpecificConstants(CHAIN_ID.BASE_SEPOLIA, RPC).pimlicoRpcURL).toBe("");
    const withKey = _getChainSpecificConstants(CHAIN_ID.BASE_SEPOLIA, RPC, "KEY123");
    expect(withKey.pimlicoRpcURL).toBe(
      `https://api.pimlico.io/v2/${CHAIN_ID.BASE_SEPOLIA}/rpc?apikey=KEY123`,
    );
  });
});

describe("_getChainSpecificConstants - unsupported chains", () => {
  it("throws for an unknown chain id (no config)", () => {
    expect(() => _getChainSpecificConstants(999999 as CHAIN_ID, RPC)).toThrow(
      /Unsupported chain id/,
    );
  });
});

describe("_chainId", () => {
  it("asks each client for its chain id once", async () => {
    const client = { getChainId: vi.fn().mockResolvedValue(84532) };

    const ids = await Promise.all([_chainId(client), _chainId(client), _chainId(client)]);
    expect(ids).toEqual([84532, 84532, 84532]);
    expect(client.getChainId).toHaveBeenCalledTimes(1);

    const other = { getChainId: vi.fn().mockResolvedValue(8453) };
    expect(await _chainId(other)).toBe(8453);
  });

  it("asks again after a failed lookup", async () => {
    const client = { getChainId: vi.fn().mockRejectedValueOnce(new Error("down")).mockResolvedValue(84532) };

    await expect(_chainId(client)).rejects.toThrow("down");
    expect(await _chainId(client)).toBe(84532);
    expect(client.getChainId).toHaveBeenCalledTimes(2);
  });
});
