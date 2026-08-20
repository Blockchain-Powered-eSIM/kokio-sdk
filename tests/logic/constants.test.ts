import { describe, it, expect } from "vitest";
import { baseSepolia } from "viem/chains";
import {
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
  // The guard now throws for chains whose factory addresses are still '0x'
  // placeholders, instead of silently leaking '0x' into viem calls.
  it("throws for sepolia (cleared after the EntryPoint v0.8 move)", () => {
    expect(() => _getChainSpecificConstants(CHAIN_ID.SEPOLIA, RPC)).toThrow(
      /not yet configured/,
    );
  });

  it("throws for optimism-sepolia (cleared after the EntryPoint v0.8 move)", () => {
    expect(() => _getChainSpecificConstants(CHAIN_ID.OPTIMISM_SEPOLIA, RPC)).toThrow(
      /not yet configured/,
    );
  });

  it("throws for mainnet (placeholder addresses)", () => {
    expect(() => _getChainSpecificConstants(CHAIN_ID.MAINNET, RPC)).toThrow(
      /not yet configured/,
    );
  });

  it("throws for arbitrum-one (placeholder addresses)", () => {
    expect(() => _getChainSpecificConstants(CHAIN_ID.ARBITRUM_ONE, RPC)).toThrow(
      /not yet configured/,
    );
  });

  it("throws for arbitrum-sepolia (placeholder addresses)", () => {
    expect(() => _getChainSpecificConstants(CHAIN_ID.ARBITRUM_SEPOLIA, RPC)).toThrow(
      /not yet configured/,
    );
  });

  it("throws for an unknown chain id (no config)", () => {
    expect(() => _getChainSpecificConstants(999999 as CHAIN_ID, RPC)).toThrow(
      /Unsupported chain id/,
    );
  });
});
