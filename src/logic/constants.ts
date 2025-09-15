import { WalletClient, Address } from 'viem';
import {
    mainnet,
    sepolia,
    optimism,
    optimismSepolia,
    arbitrum,
    arbitrumSepolia
} from "viem/chains";

export const ZERO = BigInt('0');

export const SIGNATURE_VALIDITY_SECONDS = 180; // 3 minutes validity

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
    chain: 
        typeof mainnet |
        typeof sepolia |
        typeof optimism |
        typeof optimismSepolia |
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
        CHAIN_ID.ARBITRUM_SEPOLIA,
    rpcURL: string,
    pimlicoAPIKey?: string
    ): chainSpecifcConstants => {

    if (chainID == CHAIN_ID.SEPOLIA) {
        return {
            factoryAddresses: sepoliaFactoryAddresses,
            chain: sepolia,
            rpcURL: rpcURL,
            pimlicoRpcURL: pimlicoAPIKey ? `https://api.pimlico.io/v2/${chainID}/rpc?apikey=${pimlicoAPIKey}` : "",
            customErrors: customErrors
        }
    }
    else if (chainID == CHAIN_ID.MAINNET) {
        return {
            factoryAddresses: mainnetFactoryAddresses,
            chain: mainnet,
            rpcURL: rpcURL,
            pimlicoRpcURL: pimlicoAPIKey ? `https://api.pimlico.io/v2/${chainID}/rpc?apikey=${pimlicoAPIKey}` : "",
            customErrors: customErrors
        }
    }
    else if (chainID == CHAIN_ID.OPTIMISM_MAINNET) {
        return {
            factoryAddresses: optimismMainnetFactoryAddresses,
            chain: optimism,
            rpcURL: rpcURL,
            pimlicoRpcURL: pimlicoAPIKey ? `https://api.pimlico.io/v2/${chainID}/rpc?apikey=${pimlicoAPIKey}` : "",
            customErrors: customErrors
        }
    }
    else if (chainID == CHAIN_ID.OPTIMISM_SEPOLIA) {
        return {
            factoryAddresses: optimismSepoliaFactoryAddresses,
            chain: optimismSepolia,
            rpcURL: rpcURL,
            pimlicoRpcURL: pimlicoAPIKey ? `https://api.pimlico.io/v2/${chainID}/rpc?apikey=${pimlicoAPIKey}` : "",
            customErrors: customErrors
        }
    }
    else if (chainID == CHAIN_ID.ARBITRUM_ONE) {
        return {
            factoryAddresses: arbitrumOneFactoryAddresses,
            chain: arbitrum,
            rpcURL: rpcURL,
            pimlicoRpcURL: pimlicoAPIKey ? `https://api.pimlico.io/v2/${chainID}/rpc?apikey=${pimlicoAPIKey}` : "",
            customErrors: customErrors
        }
    }
    else {
        return {
            factoryAddresses: arbitrumSepoliaFactoryAddresses,
            chain: arbitrumSepolia,
            rpcURL: rpcURL,
            pimlicoRpcURL: pimlicoAPIKey ? `https://api.pimlico.io/v2/${chainID}/rpc?apikey=${pimlicoAPIKey}` : "",
            customErrors: customErrors
        }
    }
}
