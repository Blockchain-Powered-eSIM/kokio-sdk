import { WalletClient } from "viem";
import {
    _extractChainID,
    _getChainSpecificConstants,
    mainnetFactoryAddresses,
    sepoliaFactoryAddresses,
    optimismMainnetFactoryAddresses,
    optimismSepoliaFactoryAddresses,
    baseMainnetFactoryAddresses,
    baseSepoliaFactoryAddresses,
    arbitrumOneFactoryAddresses,
    arbitrumSepoliaFactoryAddresses,
    customErrors,
    chainSpecifcConstants
} from "../logic/constants.js"

export interface KokioConstants {
    factoryAddresses:
            typeof sepoliaFactoryAddresses |
            typeof mainnetFactoryAddresses |
            typeof optimismMainnetFactoryAddresses |
            typeof optimismSepoliaFactoryAddresses |
            typeof baseMainnetFactoryAddresses |
            typeof baseSepoliaFactoryAddresses |
            typeof arbitrumOneFactoryAddresses |
            typeof arbitrumSepoliaFactoryAddresses;
    chain: chainSpecifcConstants["chain"];
    rpcURL: string;
    pimlicoRpcURL: string;
    customErrors: typeof customErrors;
}

/**
 * Resolves chain-specific constants for the wallet client's connected chain.
 *
 * The chain id can only be read asynchronously from the client, so resolution
 * is deferred to `load()` (memoized after the first call). Access the resolved
 * values via `await kokio.constants` on the top-level SDK instance.
 */
export class ConstantsSubPackage {
    private client: WalletClient;
    private pimlicoAPIKey: string;
    private cache?: Promise<KokioConstants>;

    constructor(client: WalletClient, pimlicoAPIKey: string) {
        this.client = client;
        this.pimlicoAPIKey = pimlicoAPIKey;
    }

    /**
     * Resolves and caches the chain-specific constants. Subsequent calls
     * return the same promise, so the chain id is only fetched once.
     */
    load(): Promise<KokioConstants> {
        if (!this.cache) {
            this.cache = (async () => {
                const chainID = await _extractChainID(this.client);
                const rpcURL = this.client.transport.url;
                const values = _getChainSpecificConstants(chainID, rpcURL, this.pimlicoAPIKey);

                return {
                    factoryAddresses: values.factoryAddresses,
                    chain: values.chain,
                    rpcURL: values.rpcURL,
                    pimlicoRpcURL: values.pimlicoRpcURL,
                    customErrors: values.customErrors,
                };
            })();
        }
        return this.cache;
    }
}
