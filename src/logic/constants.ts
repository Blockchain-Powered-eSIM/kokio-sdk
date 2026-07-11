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

export const sepoliaFactoryAddresses: Record<string, Address> = {
    DEVICE_WALLET_FACTORY: '0x63005d8214533fC7209678Aa39F7b9b0b51a7bcB',
    ESIM_WALLET_FACTORY: '0xB4473979ff8cE4e09161B08f74EEb66BD7718076',
    LAZY_WALLET_REGISTRY: '0x8a1E53b903efcc6b252CE4bD3b255202318505Ef',
    REGISTRY: '0xCa447f5C75C57f6C59027304A5Fb5A09F0E005c9',
    ENTRY_POINT: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
    SENDER_CREATOR: '0xefc2c1444ebcc4db75e7613d20c6a62ff67a167c',
    P256VERIFIER: '0xF04f3b3935aD461D17d4a8a78E7ea21d4a61AEb1'
}

export const mainnetFactoryAddresses: Record<string, Address> = {
    DEVICE_WALLET_FACTORY: '0x',
    ESIM_WALLET_FACTORY: '0x',
    LAZY_WALLET_REGISTRY: '0x',
    REGISTRY: '0x',
    ENTRY_POINT: '0x',
    SENDER_CREATOR: '0x',
    P256VERIFIER: '0x'
}

export const optimismMainnetFactoryAddresses: Record<string, Address> = {
    DEVICE_WALLET_FACTORY: '0x',
    ESIM_WALLET_FACTORY: '0x',
    LAZY_WALLET_REGISTRY: '0x',
    REGISTRY: '0x',
    ENTRY_POINT: '0x',
    SENDER_CREATOR: '0x',
    P256VERIFIER: '0x'
}

export const optimismSepoliaFactoryAddresses: Record<string, Address> = {
    DEVICE_WALLET_FACTORY: '0x243cCdE6a56b0Ba740E067f39896772748E20fFD',
    ESIM_WALLET_FACTORY: '0x8444bF9C39F01e4B092e42DC11695C61f8B93957',
    LAZY_WALLET_REGISTRY: '0x3F14D060074B174B0784056bDe5e0f8970D25ff1',
    REGISTRY: '0x96dA9cE92D2C09f7b3ADE01260608e9079f16d12',
    ENTRY_POINT: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
    SENDER_CREATOR: '0xefc2c1444ebcc4db75e7613d20c6a62ff67a167c',
    P256VERIFIER: '0x3c15a78046838481788613A9F111F972B562623C'
}

export const baseMainnetFactoryAddresses: Record<string, Address> = {
    DEVICE_WALLET_FACTORY: '0x',
    ESIM_WALLET_FACTORY: '0x',
    LAZY_WALLET_REGISTRY: '0x',
    REGISTRY: '0x',
    ENTRY_POINT: '0x',
    SENDER_CREATOR: '0x',
    P256VERIFIER: '0x'
}

export const baseSepoliaFactoryAddresses: Record<string, Address> = {
    DEVICE_WALLET_FACTORY: '0xB4473979ff8cE4e09161B08f74EEb66BD7718076',
    ESIM_WALLET_FACTORY: '0x63005d8214533fC7209678Aa39F7b9b0b51a7bcB',
    LAZY_WALLET_REGISTRY: '0x8a1E53b903efcc6b252CE4bD3b255202318505Ef',
    REGISTRY: '0xCa447f5C75C57f6C59027304A5Fb5A09F0E005c9',
    ENTRY_POINT: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
    SENDER_CREATOR: '0xefc2c1444ebcc4db75e7613d20c6a62ff67a167c',
    P256VERIFIER: '0xF04f3b3935aD461D17d4a8a78E7ea21d4a61AEb1'
}

export const arbitrumOneFactoryAddresses: Record<string, Address> = {
    DEVICE_WALLET_FACTORY: '0x',
    ESIM_WALLET_FACTORY: '0x',
    LAZY_WALLET_REGISTRY: '0x',
    REGISTRY: '0x',
    ENTRY_POINT: '0x',
    SENDER_CREATOR: '0x',
    P256VERIFIER: '0x'
}

export const arbitrumSepoliaFactoryAddresses: Record<string, Address> = {
    DEVICE_WALLET_FACTORY: '0x',
    ESIM_WALLET_FACTORY: '0x',
    LAZY_WALLET_REGISTRY: '0x',
    REGISTRY: '0x',
    ENTRY_POINT: '0x',
    SENDER_CREATOR: '0x',
    P256VERIFIER: '0x'
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
// address — an unconfigured chain leaves '0x' placeholders behind.
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
