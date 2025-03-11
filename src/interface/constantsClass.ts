import { WalletClient } from "viem";
import {
    _extractChainID,
    _getChainSpecificConstants,
    mainnetFactoryAddresses,
    sepoliaFactoryAddresses,
    optimismMainnetFactoryAddresses,
    optimismSepoliaFactoryAddresses,
    arbitrumOneFactoryAddresses,
    arbitrumSepoliaFactoryAddresses,
    customErrors
} from "../logic/constants"

export class ConstantsSubPackage {
    factoryAddresses!: 
            typeof sepoliaFactoryAddresses |
            typeof mainnetFactoryAddresses |
            typeof optimismMainnetFactoryAddresses |
            typeof optimismSepoliaFactoryAddresses |
            typeof arbitrumOneFactoryAddresses |
            typeof arbitrumSepoliaFactoryAddresses;
    customErrors!: typeof customErrors;

    constructor(client: WalletClient) {
        (async () => {
          const chainID = await _extractChainID(client);
          const values = _getChainSpecificConstants(chainID);
    
          this.factoryAddresses = values?.factoryAddresses;
          this.customErrors = values?.customErrors;
    
          return this;
        })();
    }
}