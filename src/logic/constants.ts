import { PublicClient, WalletClient } from "viem";

export const ZERO = BigInt('0');

export enum CHAIN_ID  {
    MAINNET = 1,
    SEPOLIA = 11155111,
    OPTIMISM_MAINNET = 10,
    OPTIMISM_SEPOLIA = 11155420,
    ARBITRUM_ONE = 42161,
    ARBITRUM_SEPOLIA = 421614,
}

export interface chainSpecifcConstants {
    factoryAddresses: 
        typeof sepoliaFactoryAddresses |
        typeof mainnetFactoryAddresses |
        typeof optimismMainnetFactoryAddresses |
        typeof optimismSepoliaFactoryAddresses |
        typeof arbitrumOneFactoryAddresses |
        typeof arbitrumSepoliaFactoryAddresses;
    customErrors: typeof customErrors;
}

export const sepoliaFactoryAddresses: Record<string, string> = {
    DEVICE_WALLET_FACTORY: "",
    ESIM_WALLET_FACTORY: "",
    LAZY_WALLET_REGISTRY: "",
    REGISTRY: "",
    REGISTRY_HELPER: ""
}

export const mainnetFactoryAddresses: Record<string, string> = {
    DEVICE_WALLET_FACTORY: "",
    ESIM_WALLET_FACTORY: "",
    LAZY_WALLET_REGISTRY: "",
    REGISTRY: "",
    REGISTRY_HELPER: ""
}

export const optimismMainnetFactoryAddresses: Record<string, string> = {
    DEVICE_WALLET_FACTORY: "",
    ESIM_WALLET_FACTORY: "",
    LAZY_WALLET_REGISTRY: "",
    REGISTRY: "",
    REGISTRY_HELPER: ""
}

export const optimismSepoliaFactoryAddresses: Record<string, string> = {
    DEVICE_WALLET_FACTORY: "",
    ESIM_WALLET_FACTORY: "",
    LAZY_WALLET_REGISTRY: "",
    REGISTRY: "",
    REGISTRY_HELPER: ""
}

export const arbitrumOneFactoryAddresses: Record<string, string> = {
    DEVICE_WALLET_FACTORY: "",
    ESIM_WALLET_FACTORY: "",
    LAZY_WALLET_REGISTRY: "",
    REGISTRY: "",
    REGISTRY_HELPER: ""
}

export const arbitrumSepoliaFactoryAddresses: Record<string, string> = {
    DEVICE_WALLET_FACTORY: "",
    ESIM_WALLET_FACTORY: "",
    LAZY_WALLET_REGISTRY: "",
    REGISTRY: "",
    REGISTRY_HELPER: ""
}

export const customErrors: Record<string, string> = {
    NULL_OR_UNDEFINED_VALUE: "Error: Null or undefined value provided"
}

export const _extractChainID = async (client: WalletClient | PublicClient) => {

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
            customErrors: customErrors
        }
    }
    else if (chainID == CHAIN_ID.MAINNET) {
        return {
            factoryAddresses: mainnetFactoryAddresses,
            customErrors: customErrors
        }
    }
    else if (chainID == CHAIN_ID.OPTIMISM_MAINNET) {
        return {
            factoryAddresses: optimismMainnetFactoryAddresses,
            customErrors: customErrors
        }
    }
    else if (chainID == CHAIN_ID.OPTIMISM_SEPOLIA) {
        return {
            factoryAddresses: optimismSepoliaFactoryAddresses,
            customErrors: customErrors
        }
    }
    else if (chainID == CHAIN_ID.ARBITRUM_ONE) {
        return {
            factoryAddresses: arbitrumOneFactoryAddresses,
            customErrors: customErrors
        }
    }
    else {
        return {
            factoryAddresses: arbitrumSepoliaFactoryAddresses,
            customErrors: customErrors
        }
    }
}