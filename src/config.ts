import { Address, WalletClient } from "viem";
import { ConstantsSubPackage, KokioConstants } from "./interface/constantsClass.js";
import { SmartAccountSubPackage } from "./interface/smartAccountClass.js";
import { DeviceWalletFactorySubPackage } from "./interface/deviceWalletFactoryClass.js";
import { P256VerifierSubPackage } from "./interface/P256VerifierClass.js";
import { LazyWalletRegistrySubPackage } from "./interface/lazyWalletRegistryClass.js";
import { DeviceWalletSubPackage } from "./interface/deviceWalletClass.js";
import { ESIMWalletSubPackage } from "./interface/eSIMWalletClass.js";
import { ESIMWalletFactorySubPackage } from "./interface/eSIMWalletFactoryClass.js";
import { SmartAccountClient } from "@aa-sdk/core";

// Re-export the typed error surface so consumers can `instanceof KokioError`
// (or a specific subclass) and decode on-chain reverts without reaching into
// internal module paths.
export {
    KokioError,
    NullOrUndefinedValueError,
    MissingSmartWalletError,
    MissingEOAWalletError,
    InvalidClientError,
    UnsupportedChainError,
    UnconfiguredChainError,
    CounterfactualMismatchError,
    ContractRevertError,
    decodeContractRevert,
} from "./logic/errors.js";
export type { DecodedRevert } from "./logic/errors.js";

export class Kokio {
    viemWalletClient: WalletClient;
    credentialId: string;
    rpId: string;
    organizationId: string;
    pimlicoAPIKey: string;
    gasPolicyId: string;

    private _constants: ConstantsSubPackage;

    smartAccount: SmartAccountSubPackage;
    deviceWalletFactory?: DeviceWalletFactorySubPackage;
    eSIMWalletFactory?: ESIMWalletFactorySubPackage;
    lazyWalletRegistry?: LazyWalletRegistrySubPackage;
    deviceWallet?: DeviceWalletSubPackage;
    eSIMWallet?: ESIMWalletSubPackage;
    P256Verifier?: P256VerifierSubPackage;

    constructor(
        viemWalletClient: WalletClient,
        credentialId: string,
        rpId: string,
        organizationId: string,
        pimlicoAPIKey: string,
        gasPolicyId: string,
        smartAccountClient?: SmartAccountClient,
        deviceWalletAddress?: Address,
        eSIMWalletAddress?: Address
    ) {
        this.viemWalletClient = viemWalletClient;
        this.credentialId = credentialId;
        this.rpId = rpId;
        this.organizationId = organizationId;
        this.pimlicoAPIKey = pimlicoAPIKey;
        this.gasPolicyId = gasPolicyId;

        this._constants = new ConstantsSubPackage(this.viemWalletClient, this.pimlicoAPIKey);

        this.smartAccount = new SmartAccountSubPackage(this.viemWalletClient, this.credentialId, this.rpId, this.organizationId, this.pimlicoAPIKey, this.gasPolicyId);
        this.deviceWalletFactory = smartAccountClient? new DeviceWalletFactorySubPackage(viemWalletClient, smartAccountClient): undefined;
        this.eSIMWalletFactory = smartAccountClient? new ESIMWalletFactorySubPackage(viemWalletClient, smartAccountClient): undefined;
        this.lazyWalletRegistry = smartAccountClient? new LazyWalletRegistrySubPackage(smartAccountClient): undefined;
        this.P256Verifier = smartAccountClient? new P256VerifierSubPackage(smartAccountClient): undefined;
        this.deviceWallet = deviceWalletAddress && smartAccountClient? new DeviceWalletSubPackage(viemWalletClient, smartAccountClient, deviceWalletAddress): undefined;
        this.eSIMWallet = eSIMWalletAddress && smartAccountClient? new ESIMWalletSubPackage(smartAccountClient, eSIMWalletAddress): undefined;
    }

    /**
     * Chain-specific constants (factory addresses, chain, RPC URLs, custom errors)
     * for the wallet client's connected chain. Resolution is asynchronous because
     * the chain id is read from the client, so this getter returns a promise:
     *
     *   const { factoryAddresses } = await kokio.constants;
     *
     * The underlying value is memoized, so repeated awaits do not re-fetch.
     */
    get constants(): Promise<KokioConstants> {
        return this._constants.load();
    }
}
