import { describe, it, expect, vi } from "vitest";
import { baseSepolia } from "viem/chains";
import {
  _chainId,
  _getChainSpecificConstants,
  CHAIN_ID,
  baseSepoliaFactoryAddresses,
} from "../../src/logic/constants.js";

const RPC = "https://rpc.test.invalid";

describe("_getChainSpecificConstants - configured testnets", () => {
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

describe("_getChainSpecificConstants - unconfigured chains (P1 guard)", () => {
  // The guard throws for a chain whose factory addresses are still '0x'
  // placeholders, instead of silently leaking '0x' into viem calls.
  it("throws for base mainnet (not deployed yet)", () => {
    expect(() => _getChainSpecificConstants(CHAIN_ID.BASE_MAINNET, RPC)).toThrow(
      /not yet configured/,
    );
  });

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
