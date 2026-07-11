import { describe, it, expect } from "vitest";
import { sepolia, optimismSepolia, baseSepolia, arbitrumSepolia } from "viem/chains";
import {
  _getChainSpecificConstants,
  CHAIN_ID,
  sepoliaFactoryAddresses,
  optimismSepoliaFactoryAddresses,
  baseSepoliaFactoryAddresses,
  mainnetFactoryAddresses,
  arbitrumOneFactoryAddresses,
  arbitrumSepoliaFactoryAddresses,
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

describe("_getChainSpecificConstants — unconfigured chains (current behavior)", () => {
  // These document CURRENT behavior: unconfigured chains silently return '0x'
  // placeholder factory addresses instead of throwing. Phase 2.1 adds a guard
  // that will flip these expectations to assert a thrown error.
  it("returns '0x' placeholders for mainnet", () => {
    const v = _getChainSpecificConstants(CHAIN_ID.MAINNET, RPC);
    expect(v.factoryAddresses).toBe(mainnetFactoryAddresses);
    expect(v.factoryAddresses.DEVICE_WALLET_FACTORY).toBe("0x");
  });

  it("returns '0x' placeholders for arbitrum-one", () => {
    const v = _getChainSpecificConstants(CHAIN_ID.ARBITRUM_ONE, RPC);
    expect(v.factoryAddresses).toBe(arbitrumOneFactoryAddresses);
    expect(v.factoryAddresses.DEVICE_WALLET_FACTORY).toBe("0x");
  });

  it("falls through unknown chain ids to arbitrum-sepolia '0x' placeholders", () => {
    const v = _getChainSpecificConstants(999999 as CHAIN_ID, RPC);
    expect(v.factoryAddresses).toBe(arbitrumSepoliaFactoryAddresses);
    expect(v.chain).toBe(arbitrumSepolia);
    expect(v.factoryAddresses.DEVICE_WALLET_FACTORY).toBe("0x");
  });
});
