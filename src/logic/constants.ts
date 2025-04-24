import * as dotenv from 'dotenv';
dotenv.config();

import { WalletClient } from "viem";

import {
    mainnet,
    sepolia,
    optimism,
    optimismSepolia,
    arbitrum,
    arbitrumSepolia
} from "viem/chains";

export const ZERO = BigInt('0');

export const API_KEY = process.env.API_KEY;

export enum CHAIN_ID  {
    MAINNET = 1,
    SEPOLIA = 11155111,
    OPTIMISM_MAINNET = 10,
    OPTIMISM_SEPOLIA = 11155420,
    ARBITRUM_ONE = 42161,
    ARBITRUM_SEPOLIA = 421614,
}

export const rpcURLs: Record<string, string> = {
    mainnet: `https://eth-mainnet.g.alchemy.com/v2/${API_KEY}`,
    sepolia: `https://eth-sepolia.g.alchemy.com/v2/${API_KEY}`,
    optimismMainnet : `https://opt-mainnet.g.alchemy.com/v2/${API_KEY}`,
    optimismSepolia: `https://opt-sepolia.g.alchemy.com/v2/${API_KEY}`,
    arbitrum: `https://arb-mainnet.g.alchemy.com/v2/${API_KEY}`,
    arbitrumSepolia: `https://arb-sepolia.g.alchemy.com/v2/${API_KEY}`,
}

export interface chainSpecifcConstants {
    factoryAddresses: 
        typeof sepoliaFactoryAddresses |
        typeof mainnetFactoryAddresses |
        typeof optimismMainnetFactoryAddresses |
        typeof optimismSepoliaFactoryAddresses |
        typeof arbitrumOneFactoryAddresses |
        typeof arbitrumSepoliaFactoryAddresses;
    chain: 
        typeof mainnet |
        typeof sepolia |
        typeof optimism |
        typeof optimismSepolia |
        typeof arbitrum |
        typeof arbitrumSepolia
    rpcURL: string; 
    customErrors: typeof customErrors;
}

export const sepoliaFactoryAddresses: Record<string, `0x${string}`> = {
    DEVICE_WALLET_FACTORY: '0x63005d8214533fC7209678Aa39F7b9b0b51a7bcB',
    ESIM_WALLET_FACTORY: '0xB4473979ff8cE4e09161B08f74EEb66BD7718076',
    LAZY_WALLET_REGISTRY: '0x8a1E53b903efcc6b252CE4bD3b255202318505Ef',
    REGISTRY: '0xCa447f5C75C57f6C59027304A5Fb5A09F0E005c9',
    REGISTRY_HELPER: '0x',
    ENTRY_POINT: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
    P256VERIFIER: '0xF04f3b3935aD461D17d4a8a78E7ea21d4a61AEb1'
}

export const mainnetFactoryAddresses: Record<string, `0x${string}`> = {
    DEVICE_WALLET_FACTORY: '0x',
    ESIM_WALLET_FACTORY: '0x',
    LAZY_WALLET_REGISTRY: '0x',
    REGISTRY: '0x',
    REGISTRY_HELPER: '0x',
    ENTRY_POINT: '0x',
    P256VERIFIER: '0x'
}

export const optimismMainnetFactoryAddresses: Record<string, `0x${string}`> = {
    DEVICE_WALLET_FACTORY: '0x',
    ESIM_WALLET_FACTORY: '0x',
    LAZY_WALLET_REGISTRY: '0x',
    REGISTRY: '0x',
    REGISTRY_HELPER: '0x',
    ENTRY_POINT: '0x',
    P256VERIFIER: '0x'
}

export const optimismSepoliaFactoryAddresses: Record<string, `0x${string}`> = {
    DEVICE_WALLET_FACTORY: '0x3feA4dB0C0bBB73142d5bB6b776EE238884a3705',
    ESIM_WALLET_FACTORY: '0xaD2Ba6248D0e6990a844C94ACE78F8775A68b631',
    LAZY_WALLET_REGISTRY: '0x29b98C32D83604664fd0742b9112b0825a74849F',
    REGISTRY: '0xaeB98F0f092fCb4a476ea3a5EB6A4B9E3D63A686',
    REGISTRY_HELPER: '0x',
    ENTRY_POINT: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
    P256VERIFIER: '0x5349aEA97Faa6D5d6D78A8847068300a4eC9D39E'
}

export const arbitrumOneFactoryAddresses: Record<string, `0x${string}`> = {
    DEVICE_WALLET_FACTORY: '0x',
    ESIM_WALLET_FACTORY: '0x',
    LAZY_WALLET_REGISTRY: '0x',
    REGISTRY: '0x',
    REGISTRY_HELPER: '0x',
    ENTRY_POINT: '0x',
    P256VERIFIER: '0x'
}

export const arbitrumSepoliaFactoryAddresses: Record<string, `0x${string}`> = {
    DEVICE_WALLET_FACTORY: '0x',
    ESIM_WALLET_FACTORY: '0x',
    LAZY_WALLET_REGISTRY: '0x',
    REGISTRY: '0x',
    REGISTRY_HELPER: '0x',
    ENTRY_POINT: '0x',
    P256VERIFIER: '0x'
}

export const customErrors: Record<string, string> = {
    NULL_OR_UNDEFINED_VALUE: "Error: Null or undefined value provided",
    MISSING_SMART_WALLET: "Error: Client does not have smart wallet account associated"
}

export const _extractChainID = async (client: WalletClient) => {

    if (!client) {
        throw "Invalid Signer or Provider instance";
    }
    return client.getChainId();
}

export const _getChainSpecificConstants = (
    chainID: 
        CHAIN_ID.SEPOLIA | 
        CHAIN_ID.MAINNET | 
        CHAIN_ID.OPTIMISM_MAINNET | 
        CHAIN_ID.OPTIMISM_SEPOLIA |
        CHAIN_ID.ARBITRUM_ONE |
        CHAIN_ID.ARBITRUM_SEPOLIA
    ): chainSpecifcConstants => {

    if (chainID == CHAIN_ID.SEPOLIA) {
        return {
            factoryAddresses: sepoliaFactoryAddresses,
            chain: sepolia,
            rpcURL: rpcURLs.sepolia,
            customErrors: customErrors
        }
    }
    else if (chainID == CHAIN_ID.MAINNET) {
        return {
            factoryAddresses: mainnetFactoryAddresses,
            chain: mainnet,
            rpcURL: rpcURLs.mainnet,
            customErrors: customErrors
        }
    }
    else if (chainID == CHAIN_ID.OPTIMISM_MAINNET) {
        return {
            factoryAddresses: optimismMainnetFactoryAddresses,
            chain: optimism,
            rpcURL: rpcURLs.optimismMainnet,
            customErrors: customErrors
        }
    }
    else if (chainID == CHAIN_ID.OPTIMISM_SEPOLIA) {
        return {
            factoryAddresses: optimismSepoliaFactoryAddresses,
            chain: optimismSepolia,
            rpcURL: rpcURLs.optimismSepolia,
            customErrors: customErrors
        }
    }
    else if (chainID == CHAIN_ID.ARBITRUM_ONE) {
        return {
            factoryAddresses: arbitrumOneFactoryAddresses,
            chain: arbitrum,
            rpcURL: rpcURLs.arbitrum,
            customErrors: customErrors
        }
    }
    else {
        return {
            factoryAddresses: arbitrumSepoliaFactoryAddresses,
            chain: arbitrumSepolia,
            rpcURL: rpcURLs.arbitrumSepolia,
            customErrors: customErrors
        }
    }
}