import { WalletClient, Address } from 'viem';
import {
    InvalidClientError,
    UnconfiguredChainError,
    UnsupportedChainError,
} from './errors.js';
import {
    mainnet,
    sepolia,
    optimism,
    optimismSepolia,
    arbitrum,
    arbitrumSepolia,
    base,
    baseSepolia
} from "viem/chains";

export const ZERO = BigInt('0');

export const SIGNATURE_VALIDITY_SECONDS = 180; // 3 minutes validity

export enum CHAIN_ID  {
    MAINNET = 1,
    SEPOLIA = 11155111,
    OPTIMISM_MAINNET = 10,
    OPTIMISM_SEPOLIA = 11155420,
    BASE_MAINNET = 8453,
    BASE_SEPOLIA = 84532,
    ARBITRUM_ONE = 42161,
    ARBITRUM_SEPOLIA = 421614,
}

export interface chainSpecifcConstants {
    factoryAddresses: 
        typeof sepoliaFactoryAddresses |
        typeof mainnetFactoryAddresses |
        typeof optimismMainnetFactoryAddresses |
        typeof optimismSepoliaFactoryAddresses |
        typeof baseMainnetFactoryAddresses |
        typeof baseSepoliaFactoryAddresses |
        typeof arbitrumOneFactoryAddresses |
        typeof arbitrumSepoliaFactoryAddresses;
    chain: 
        typeof mainnet |
        typeof sepolia |
        typeof optimism |
        typeof optimismSepolia |
        typeof base |
        typeof baseSepolia |
        typeof arbitrum |
        typeof arbitrumSepolia
    rpcURL: string;
    pimlicoRpcURL: string;
    customErrors: typeof customErrors;
}

// Cleared: the deployment here targets EntryPoint v0.7, which this SDK no longer
// speaks. Refill only after a redeploy on v0.8.
export const sepoliaFactoryAddresses: Record<string, Address> = {
    DEVICE_WALLET_FACTORY: '0x',
    ESIM_WALLET_FACTORY: '0x',
    LAZY_WALLET_REGISTRY: '0x',
    REGISTRY: '0x',
    ENTRY_POINT: '0x',
    SENDER_CREATOR: '0x',
    P256VERIFIER: '0x',
    PROTOCOL_ADMIN: '0x'
}

export const mainnetFactoryAddresses: Record<string, Address> = {
    DEVICE_WALLET_FACTORY: '0x',
    ESIM_WALLET_FACTORY: '0x',
    LAZY_WALLET_REGISTRY: '0x',
    REGISTRY: '0x',
    ENTRY_POINT: '0x',
    SENDER_CREATOR: '0x',
    P256VERIFIER: '0x',
    PROTOCOL_ADMIN: '0x'
}

export const optimismMainnetFactoryAddresses: Record<string, Address> = {
    DEVICE_WALLET_FACTORY: '0x',
    ESIM_WALLET_FACTORY: '0x',
    LAZY_WALLET_REGISTRY: '0x',
    REGISTRY: '0x',
    ENTRY_POINT: '0x',
    SENDER_CREATOR: '0x',
    P256VERIFIER: '0x',
    PROTOCOL_ADMIN: '0x'
}

// Cleared for the same reason as Sepolia: a v0.7 deployment this SDK cannot use.
export const optimismSepoliaFactoryAddresses: Record<string, Address> = {
    DEVICE_WALLET_FACTORY: '0x',
    ESIM_WALLET_FACTORY: '0x',
    LAZY_WALLET_REGISTRY: '0x',
    REGISTRY: '0x',
    ENTRY_POINT: '0x',
    SENDER_CREATOR: '0x',
    P256VERIFIER: '0x',
    PROTOCOL_ADMIN: '0x'
}

export const baseMainnetFactoryAddresses: Record<string, Address> = {
    DEVICE_WALLET_FACTORY: '0x',
    ESIM_WALLET_FACTORY: '0x',
    LAZY_WALLET_REGISTRY: '0x',
    REGISTRY: '0x',
    ENTRY_POINT: '0x',
    SENDER_CREATOR: '0x',
    P256VERIFIER: '0x',
    PROTOCOL_ADMIN: '0x'
}

export const baseSepoliaFactoryAddresses: Record<string, Address> = {
    DEVICE_WALLET_FACTORY: '0xB006c7066C89a5d7Bfc229e9fb0bADf96c8F979f',
    ESIM_WALLET_FACTORY: '0x13998C0bb7433c51cE5101922B12EE69F459699A',
    LAZY_WALLET_REGISTRY: '0x394177c5cc4762b897c37de1820259B75993e033',
    REGISTRY: '0x89e386E3251692F21a2E9048A46518AdC2A5Cb4A',
    ENTRY_POINT: '0x4337084D9E255Ff0702461CF8895CE9E3b5Ff108',
    SENDER_CREATOR: '0x449ED7C3e6Fee6a97311d4b55475DF59C44AdD33',
    P256VERIFIER: '0x625561429bD99d647956ccBCA4eBf762aaA142c5',
    PROTOCOL_ADMIN: '0x77A1D6f27462c34BF038832d9Cff6b3E94a9Fe6F'
}

export const arbitrumOneFactoryAddresses: Record<string, Address> = {
    DEVICE_WALLET_FACTORY: '0x',
    ESIM_WALLET_FACTORY: '0x',
    LAZY_WALLET_REGISTRY: '0x',
    REGISTRY: '0x',
    ENTRY_POINT: '0x',
    SENDER_CREATOR: '0x',
    P256VERIFIER: '0x',
    PROTOCOL_ADMIN: '0x'
}

export const arbitrumSepoliaFactoryAddresses: Record<string, Address> = {
    DEVICE_WALLET_FACTORY: '0x',
    ESIM_WALLET_FACTORY: '0x',
    LAZY_WALLET_REGISTRY: '0x',
    REGISTRY: '0x',
    ENTRY_POINT: '0x',
    SENDER_CREATOR: '0x',
    P256VERIFIER: '0x',
    PROTOCOL_ADMIN: '0x'
}

export const customErrors: Record<string, string> = {
    NULL_OR_UNDEFINED_VALUE: "Error: Null or undefined value provided",
    MISSING_SMART_WALLET: "Error: Client does not have smart wallet account associated",
    MISSING_EOA_WALLET: "Error: Client does not have EOA wallet associated"
}

export const _extractChainID = async (client: WalletClient) => {

    if (!client) {
        throw new InvalidClientError();
    }
    return client.getChainId();
}

// Maps each supported chain id to its factory-address book + viem chain. Chains
// whose addresses are still '0x' placeholders are intentionally listed so the
// guard below can reject them with a clear message rather than leaking '0x'
// into viem calls.
const CHAIN_CONFIG: Record<number, { factoryAddresses: Record<string, Address>; chain: chainSpecifcConstants["chain"] }> = {
    [CHAIN_ID.SEPOLIA]: { factoryAddresses: sepoliaFactoryAddresses, chain: sepolia },
    [CHAIN_ID.MAINNET]: { factoryAddresses: mainnetFactoryAddresses, chain: mainnet },
    [CHAIN_ID.OPTIMISM_MAINNET]: { factoryAddresses: optimismMainnetFactoryAddresses, chain: optimism },
    [CHAIN_ID.OPTIMISM_SEPOLIA]: { factoryAddresses: optimismSepoliaFactoryAddresses, chain: optimismSepolia },
    [CHAIN_ID.BASE_MAINNET]: { factoryAddresses: baseMainnetFactoryAddresses, chain: base },
    [CHAIN_ID.BASE_SEPOLIA]: { factoryAddresses: baseSepoliaFactoryAddresses, chain: baseSepolia },
    [CHAIN_ID.ARBITRUM_ONE]: { factoryAddresses: arbitrumOneFactoryAddresses, chain: arbitrum },
    [CHAIN_ID.ARBITRUM_SEPOLIA]: { factoryAddresses: arbitrumSepoliaFactoryAddresses, chain: arbitrumSepolia },
};

// A factory address book is only usable if every entry is a real 20-byte
// address - an unconfigured chain leaves '0x' placeholders behind.
const _hasUnconfiguredAddresses = (addresses: Record<string, Address>): boolean =>
    Object.values(addresses).some((a) => !a || a === '0x' || a.length !== 42);

export const _getChainSpecificConstants = (
    chainID:
        CHAIN_ID.SEPOLIA |
        CHAIN_ID.MAINNET |
        CHAIN_ID.OPTIMISM_MAINNET |
        CHAIN_ID.OPTIMISM_SEPOLIA |
        CHAIN_ID.BASE_MAINNET |
        CHAIN_ID.BASE_SEPOLIA |
        CHAIN_ID.ARBITRUM_ONE |
        CHAIN_ID.ARBITRUM_SEPOLIA,
    rpcURL: string,
    pimlicoAPIKey?: string
    ): chainSpecifcConstants => {

    const config = CHAIN_CONFIG[chainID];

    if (!config) {
        throw new UnsupportedChainError(chainID);
    }

    if (_hasUnconfiguredAddresses(config.factoryAddresses)) {
        throw new UnconfiguredChainError(chainID);
    }

    return {
        factoryAddresses: config.factoryAddresses,
        chain: config.chain,
        rpcURL: rpcURL,
        pimlicoRpcURL: pimlicoAPIKey ? `https://api.pimlico.io/v2/${chainID}/rpc?apikey=${pimlicoAPIKey}` : "",
        customErrors: customErrors,
    };
}
