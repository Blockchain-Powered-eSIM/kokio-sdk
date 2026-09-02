import { Address, WalletClient } from "viem";
import { ConstantsSubPackage, KokioConstants } from "./interface/constantsClass.js";
import { SmartAccountSubPackage } from "./interface/smartAccountClass.js";
import { DeviceWalletFactorySubPackage } from "./interface/deviceWalletFactoryClass.js";
import { P256VerifierSubPackage } from "./interface/P256VerifierClass.js";
import { RegistrySubPackage } from "./interface/registryClass.js";
import { DeviceWalletSubPackage } from "./interface/deviceWalletClass.js";
import { ESIMWalletSubPackage } from "./interface/eSIMWalletClass.js";
import { ESIMWalletFactorySubPackage } from "./interface/eSIMWalletFactoryClass.js";
import { PaymentAdapterSubPackage } from "./interface/paymentAdapterClass.js";
import { KokioSmartAccountClient } from "./types.js";

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
    pimlicoAPIKey: string;
    gasPolicyId: string;
    smartAccountClient?: KokioSmartAccountClient;
    deviceWalletAddress?: Address;
    eSIMWalletAddress?: Address;

    private _constants: ConstantsSubPackage;

    smartAccount: SmartAccountSubPackage;
    deviceWalletFactory?: DeviceWalletFactorySubPackage;
    eSIMWalletFactory?: ESIMWalletFactorySubPackage;
    registry?: RegistrySubPackage;
    deviceWallet?: DeviceWalletSubPackage;
    eSIMWallet?: ESIMWalletSubPackage;
    P256Verifier?: P256VerifierSubPackage;
    paymentAdapter?: PaymentAdapterSubPackage;

    constructor(
        viemWalletClient: WalletClient,
        credentialId: string,
        rpId: string,
        pimlicoAPIKey: string,
        gasPolicyId: string,
        smartAccountClient?: KokioSmartAccountClient,
        deviceWalletAddress?: Address,
        eSIMWalletAddress?: Address
    ) {
        this.viemWalletClient = viemWalletClient;
        this.credentialId = credentialId;
        this.rpId = rpId;
        this.pimlicoAPIKey = pimlicoAPIKey;
        this.gasPolicyId = gasPolicyId;
        this.smartAccountClient = smartAccountClient;
        this.deviceWalletAddress = deviceWalletAddress;
        this.eSIMWalletAddress = eSIMWalletAddress;

        this._constants = new ConstantsSubPackage(this.viemWalletClient, this.pimlicoAPIKey);

        this.smartAccount = new SmartAccountSubPackage(this.viemWalletClient, this.credentialId, this.rpId, this.pimlicoAPIKey, this.gasPolicyId);
        this.deviceWalletFactory = smartAccountClient? new DeviceWalletFactorySubPackage(viemWalletClient, smartAccountClient): undefined;
        this.eSIMWalletFactory = smartAccountClient? new ESIMWalletFactorySubPackage(viemWalletClient, smartAccountClient): undefined;
        this.registry = smartAccountClient? new RegistrySubPackage(smartAccountClient): undefined;
        this.P256Verifier = smartAccountClient? new P256VerifierSubPackage(smartAccountClient): undefined;
        this.paymentAdapter = smartAccountClient? new PaymentAdapterSubPackage(smartAccountClient): undefined;
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

    /**
     * Bind a `DeviceWallet` instance address after construction and (re)wire
     * the `deviceWallet` surface to it. Returns `this` for chaining.
     *
     * Needs a `smartAccountClient` already on this instance - every write on
     * `deviceWallet` sends a user operation through it. Without one,
     * `deviceWallet` stays `undefined`, same as when no address is passed to
     * the constructor.
     */
    setDeviceWalletAddress(deviceWalletAddress: Address): this {
        this.deviceWalletAddress = deviceWalletAddress;
        this.deviceWallet = this.smartAccountClient
            ? new DeviceWalletSubPackage(this.viemWalletClient, this.smartAccountClient, deviceWalletAddress)
            : undefined;
        return this;
    }

    /**
     * Bind an `ESIMWallet` instance address after construction and (re)wire
     * the `eSIMWallet` surface to it. Returns `this` for chaining.
     *
     * A user holding several eSIM wallets can call this to switch which one
     * `kokio.eSIMWallet` acts on, without re-creating `Kokio`. Same
     * `smartAccountClient` requirement as {@link setDeviceWalletAddress}.
     */
    setESIMWalletAddress(eSIMWalletAddress: Address): this {
        this.eSIMWalletAddress = eSIMWalletAddress;
        this.eSIMWallet = this.smartAccountClient
            ? new ESIMWalletSubPackage(this.smartAccountClient, eSIMWalletAddress)
            : undefined;
        return this;
    }
}
