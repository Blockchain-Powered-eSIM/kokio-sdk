import { Address, WalletClient } from "viem";
import { AdminDeviceWalletFactorySubPackage } from "./interface/deviceWalletFactoryClass.js";
import { AdminESIMWalletFactorySubPackage } from "./interface/eSIMWalletFactoryClass.js";
import { AdminRegistrySubPackage } from "./interface/registryClass.js";
import { AdminLazyWalletRegistrySubPackage } from "./interface/lazyWalletRegistryClass.js";
import { AdminDeviceWalletSubPackage } from "./interface/deviceWalletClass.js";
import { AdminESIMWalletSubPackage } from "./interface/eSIMWalletClass.js";

// Re-export the typed error surface so backend consumers can `instanceof
// KokioError` (or a subclass) and decode reverts without reaching into internal
// module paths - mirroring `config.ts`.
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
} from "../logic/errors.js";
export type { DecodedRevert } from "../logic/errors.js";

/**
 * EOA-only entry point for the NodeJS backend.
 *
 * Unlike {@link Kokio} (the mobile/passkey surface), `KokioAdmin` needs no
 * bundler, paymaster, or WebAuthn params - only a viem `WalletClient` carrying
 * the admin/owner EOA. It exposes exactly the contract functions that are
 * `onlyAdmin`/`onlyOwner`/`onlyESIMWalletAdmin(OrRegistry)` on chain and thus
 * callable directly by an EOA (never via a device-wallet userOp).
 *
 * Contract-instance surfaces (`deviceWallet`, `eSIMWallet`) target a specific
 * deployed address. The backend often does not know that address at construction
 * time - e.g. it deploys a device wallet, then acts on it - so those addresses
 * can be supplied later via {@link setDeviceWalletAddress}/{@link setESIMWalletAddress}
 * on the *same* instance, without re-constructing. The accessors stay `undefined`
 * until their address is set.
 */
export class KokioAdmin {

    walletClient: WalletClient;
    deviceWalletAddress?: Address;
    eSIMWalletAddress?: Address;

    // Chain-wide surfaces - available as soon as a wallet client exists.
    deviceWalletFactory: AdminDeviceWalletFactorySubPackage;
    eSIMWalletFactory: AdminESIMWalletFactorySubPackage;
    registry: AdminRegistrySubPackage;
    lazyWalletRegistry: AdminLazyWalletRegistrySubPackage;

    // Instance-scoped surfaces - undefined until their address is known.
    deviceWallet?: AdminDeviceWalletSubPackage;
    eSIMWallet?: AdminESIMWalletSubPackage;

    constructor(walletClient: WalletClient, deviceWalletAddress?: Address, eSIMWalletAddress?: Address) {
        this.walletClient = walletClient;
        this.deviceWalletAddress = deviceWalletAddress;
        this.eSIMWalletAddress = eSIMWalletAddress;

        this.deviceWalletFactory = new AdminDeviceWalletFactorySubPackage(walletClient);
        this.eSIMWalletFactory = new AdminESIMWalletFactorySubPackage(walletClient);
        this.registry = new AdminRegistrySubPackage(walletClient);
        this.lazyWalletRegistry = new AdminLazyWalletRegistrySubPackage(walletClient);

        this.deviceWallet = deviceWalletAddress ? new AdminDeviceWalletSubPackage(walletClient, deviceWalletAddress) : undefined;
        this.eSIMWallet = eSIMWalletAddress ? new AdminESIMWalletSubPackage(walletClient, eSIMWalletAddress) : undefined;
    }

    /**
     * Bind a `DeviceWallet` instance address after construction and (re)wire the
     * `deviceWallet` surface to it. Returns `this` for chaining. This is the
     * backend's primary flow: deploy a wallet, resolve its address, then keep
     * using the same `KokioAdmin` reference.
     */
    setDeviceWalletAddress(deviceWalletAddress: Address): this {
        this.deviceWalletAddress = deviceWalletAddress;
        this.deviceWallet = new AdminDeviceWalletSubPackage(this.walletClient, deviceWalletAddress);
        return this;
    }

    /**
     * Bind an `ESIMWallet` instance address after construction and (re)wire the
     * `eSIMWallet` surface to it. Returns `this` for chaining.
     */
    setESIMWalletAddress(eSIMWalletAddress: Address): this {
        this.eSIMWalletAddress = eSIMWalletAddress;
        this.eSIMWallet = new AdminESIMWalletSubPackage(this.walletClient, eSIMWalletAddress);
        return this;
    }

    /**
     * Swap the underlying wallet client (e.g. to change the acting EOA) and
     * re-instantiate every surface against it, preserving any bound instance
     * addresses. Returns `this` for chaining.
     */
    setWalletClient(walletClient: WalletClient): this {
        this.walletClient = walletClient;

        this.deviceWalletFactory = new AdminDeviceWalletFactorySubPackage(walletClient);
        this.eSIMWalletFactory = new AdminESIMWalletFactorySubPackage(walletClient);
        this.registry = new AdminRegistrySubPackage(walletClient);
        this.lazyWalletRegistry = new AdminLazyWalletRegistrySubPackage(walletClient);

        this.deviceWallet = this.deviceWalletAddress ? new AdminDeviceWalletSubPackage(walletClient, this.deviceWalletAddress) : undefined;
        this.eSIMWallet = this.eSIMWalletAddress ? new AdminESIMWalletSubPackage(walletClient, this.eSIMWalletAddress) : undefined;

        return this;
    }
}
