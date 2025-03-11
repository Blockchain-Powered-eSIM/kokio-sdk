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

export enum CHAIN_ID  {
    MAINNET = 1,
    SEPOLIA = 11155111,
    OPTIMISM_MAINNET = 10,
    OPTIMISM_SEPOLIA = 11155420,
    ARBITRUM_ONE = 42161,
    ARBITRUM_SEPOLIA = 421614,
}

export const rpcURLs: Record<string, string> = {
    mainnet: "https://eth-mainnet.g.alchemy.com/v2/ubxhpI1U752vJUdXq9n3b12xnNFYjM5w",
    sepolia: "https://eth-sepolia.g.alchemy.com/v2/ubxhpI1U752vJUdXq9n3b12xnNFYjM5w",
    optimismMainnet : "https://opt-mainnet.g.alchemy.com/v2/ubxhpI1U752vJUdXq9n3b12xnNFYjM5w",
    optimismSepolia: "https://opt-sepolia.g.alchemy.com/v2/ubxhpI1U752vJUdXq9n3b12xnNFYjM5w",
    arbitrum: "https://arb-mainnet.g.alchemy.com/v2/ubxhpI1U752vJUdXq9n3b12xnNFYjM5w",
    arbitrumSepolia: "https://arb-sepolia.g.alchemy.com/v2/ubxhpI1U752vJUdXq9n3b12xnNFYjM5w",
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
    DEVICE_WALLET_FACTORY: '0x',
    ESIM_WALLET_FACTORY: '0x',
    LAZY_WALLET_REGISTRY: '0x',
    REGISTRY: '0x',
    REGISTRY_HELPER: '0x',
    ENTRY_POINT: '0x'
}

export const mainnetFactoryAddresses: Record<string, `0x${string}`> = {
    DEVICE_WALLET_FACTORY: '0x',
    ESIM_WALLET_FACTORY: '0x',
    LAZY_WALLET_REGISTRY: '0x',
    REGISTRY: '0x',
    REGISTRY_HELPER: '0x',
    ENTRY_POINT: '0x'
}

export const optimismMainnetFactoryAddresses: Record<string, `0x${string}`> = {
    DEVICE_WALLET_FACTORY: '0x',
    ESIM_WALLET_FACTORY: '0x',
    LAZY_WALLET_REGISTRY: '0x',
    REGISTRY: '0x',
    REGISTRY_HELPER: '0x',
    ENTRY_POINT: '0x'
}

export const optimismSepoliaFactoryAddresses: Record<string, `0x${string}`> = {
    DEVICE_WALLET_FACTORY: '0x',
    ESIM_WALLET_FACTORY: '0x',
    LAZY_WALLET_REGISTRY: '0x',
    REGISTRY: '0x',
    REGISTRY_HELPER: '0x',
    ENTRY_POINT: '0x'
}

export const arbitrumOneFactoryAddresses: Record<string, `0x${string}`> = {
    DEVICE_WALLET_FACTORY: '0x',
    ESIM_WALLET_FACTORY: '0x',
    LAZY_WALLET_REGISTRY: '0x',
    REGISTRY: '0x',
    REGISTRY_HELPER: '0x',
    ENTRY_POINT: '0x'
}

export const arbitrumSepoliaFactoryAddresses: Record<string, `0x${string}`> = {
    DEVICE_WALLET_FACTORY: '0x',
    ESIM_WALLET_FACTORY: '0x',
    LAZY_WALLET_REGISTRY: '0x',
    REGISTRY: '0x',
    REGISTRY_HELPER: '0x',
    ENTRY_POINT: '0x'
}

export const customErrors: Record<string, string> = {
    NULL_OR_UNDEFINED_VALUE: "Error: Null or undefined value provided"
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