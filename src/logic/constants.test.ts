import { describe, it, expect } from "vitest";
import { sepolia, optimismSepolia, baseSepolia } from "viem/chains";
import {
  _getChainSpecificConstants,
  CHAIN_ID,
  sepoliaFactoryAddresses,
  optimismSepoliaFactoryAddresses,
  baseSepoliaFactoryAddresses,
} from "./constants.js";

const RPC = "https://rpc.test.invalid";

describe("_getChainSpecificConstants — configured testnets", () => {
  it("maps sepolia to its factory addresses + chain", () => {
    const v = _getChainSpecificConstants(CHAIN_ID.SEPOLIA, RPC);
    expect(v.factoryAddresses).toBe(sepoliaFactoryAddresses);
    expect(v.chain).toBe(sepolia);
    expect(v.rpcURL).toBe(RPC);
  });

  it("maps optimism-sepolia", () => {
    const v = _getChainSpecificConstants(CHAIN_ID.OPTIMISM_SEPOLIA, RPC);
    expect(v.factoryAddresses).toBe(optimismSepoliaFactoryAddresses);
    expect(v.chain).toBe(optimismSepolia);
  });

  it("maps base-sepolia", () => {
    const v = _getChainSpecificConstants(CHAIN_ID.BASE_SEPOLIA, RPC);
    expect(v.factoryAddresses).toBe(baseSepoliaFactoryAddresses);
    expect(v.chain).toBe(baseSepolia);
  });

  it("builds the pimlico RPC URL only when an API key is supplied", () => {
    expect(_getChainSpecificConstants(CHAIN_ID.SEPOLIA, RPC).pimlicoRpcURL).toBe("");
    const withKey = _getChainSpecificConstants(CHAIN_ID.SEPOLIA, RPC, "KEY123");
    expect(withKey.pimlicoRpcURL).toBe(
      `https://api.pimlico.io/v2/${CHAIN_ID.SEPOLIA}/rpc?apikey=KEY123`,
    );
  });
});

describe("_getChainSpecificConstants — unconfigured chains (P1 guard)", () => {
  // The guard now throws for chains whose factory addresses are still '0x'
  // placeholders, instead of silently leaking '0x' into viem calls.
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
