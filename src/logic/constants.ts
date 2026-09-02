import { WalletClient, Address } from 'viem';
import {
    InvalidClientError,
    UnconfiguredChainError,
    UnsupportedChainError,
} from './errors.js';
import {
    base,
    baseSepolia
} from "viem/chains";

export const ZERO = BigInt('0');

export const SIGNATURE_VALIDITY_SECONDS = 180; // 3 minutes validity

// Gas estimation runs before a passkey signature exists, so the account hands the
// bundler "0x" as a stub. Account4337 rejects any signature of 39 bytes or fewer
// before it reaches the P256 verifier, so the bundler measures an early return and
// prices calldata that is 519 bytes short of the real thing. Both estimates come
// back too low and an operation sized from them is refused, so both are padded.
//
// Measured on Base Sepolia: verification estimated at 33,703 gas against a floor of
// 76,628, and preVerificationGas 11,536 lower than the same operation carrying a
// real-length signature.

// Unused verification gas is refunded in full, unlike callGasLimit, so headroom
// here only raises the prefund the sponsor has to post and costs nothing when it
// goes unspent.
export const STUB_VERIFICATION_GAS_PAD = BigInt(60_000);

// preVerificationGas is charged whether or not it is used, so this stays close to
// the measured shortfall.
export const STUB_PRE_VERIFICATION_GAS_PAD = BigInt(15_000);

// Only the two chains the protocol actually targets. A chain gets an entry here
// once a deployment exists for it, not before.
export enum CHAIN_ID  {
    BASE_MAINNET = 8453,
    BASE_SEPOLIA = 84532,
}

export interface chainSpecifcConstants {
    factoryAddresses:
        typeof baseMainnetFactoryAddresses |
        typeof baseSepoliaFactoryAddresses;
    chain:
        typeof base |
        typeof baseSepolia
    rpcURL: string;
    pimlicoRpcURL: string;
    customErrors: typeof customErrors;
}

// Not yet deployed. Kept as a placeholder so mainnet has a documented shape to
// fill in once the protocol ships there, following Base Sepolia's soak.
export const baseMainnetFactoryAddresses: Record<string, Address> = {
    DEVICE_WALLET_FACTORY: '0x',
    ESIM_WALLET_FACTORY: '0x',
    LAZY_WALLET_REGISTRY: '0x',
    REGISTRY: '0x',
    ENTRY_POINT: '0x',
    SENDER_CREATOR: '0x',
    P256VERIFIER: '0x',
    PROTOCOL_ADMIN: '0x',
    PAYMENT_ADAPTER: '0x'
}

export const baseSepoliaFactoryAddresses: Record<string, Address> = {
    DEVICE_WALLET_FACTORY: '0x0BB3BA8D9233514a4aA6D72c243a2473f9cFf0bb',
    ESIM_WALLET_FACTORY: '0x57da54e07705de17c713ec311ac193e83470D5a5',
    LAZY_WALLET_REGISTRY: '0x5bE46Cf216186Bc2E3C220729331D6bE7d186e84',
    REGISTRY: '0x916b6b554119c789EF3026EDeB0E1Ba741b42A49',
    ENTRY_POINT: '0x4337084D9E255Ff0702461CF8895CE9E3b5Ff108',
    SENDER_CREATOR: '0x449ED7C3e6Fee6a97311d4b55475DF59C44AdD33',
    P256VERIFIER: '0x6FA3E7E145476Dc4682734Fd845019A3872b4821',
    PROTOCOL_ADMIN: '0xdDeCC2C1345BC966337B5f4Fe57EC2D5bfad751A',
    PAYMENT_ADAPTER: '0xBFaA666a8074924588E96507c307b680ecCeB2c1'
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

// Maps each supported chain id to its factory-address book + viem chain. Base
// Mainnet is listed with '0x' placeholders so the guard below rejects it with a
// clear message rather than leaking '0x' into viem calls.
const CHAIN_CONFIG: Record<number, { factoryAddresses: Record<string, Address>; chain: chainSpecifcConstants["chain"] }> = {
    [CHAIN_ID.BASE_MAINNET]: { factoryAddresses: baseMainnetFactoryAddresses, chain: base },
    [CHAIN_ID.BASE_SEPOLIA]: { factoryAddresses: baseSepoliaFactoryAddresses, chain: baseSepolia },
};

// A factory address book is only usable if every entry is a real 20-byte
// address - an unconfigured chain leaves '0x' placeholders behind.
const _hasUnconfiguredAddresses = (addresses: Record<string, Address>): boolean =>
    Object.values(addresses).some((a) => !a || a === '0x' || a.length !== 42);

export const _getChainSpecificConstants = (
    chainID:
        CHAIN_ID.BASE_MAINNET |
        CHAIN_ID.BASE_SEPOLIA,
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
