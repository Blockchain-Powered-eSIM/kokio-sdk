import { Address, Hex, WalletClient, publicActions } from "viem";
import { _getChainSpecificConstants } from "../../constants.js";
import { Registry } from "../../../abis/index.js";

// Read-only admin logic for `Registry` (which inherits `RegistryHelper`, so its
// ABI carries the helper mappings too). Surfaces the public storage getters for
// the backend. Each read extends the `WalletClient` with `publicActions`; no EOA
// account is required.

/**
 * The admin EOA (`eSIMWalletAdmin`) recorded in the registry. Reads zero while a
 * nomination is pending or the admin is suspended, which means the role is
 * dormant rather than unset.
 */
export const _eSIMWalletAdmin = async (client: WalletClient): Promise<Address> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "eSIMWalletAdmin",
        args: []
    }) as Promise<Address>;
}

/**
 * The admin address on the books, which keeps naming a suspended admin so the
 * suspension can be lifted without supplying it again. Ask `_eSIMWalletAdmin`
 * who may actually act.
 */
export const _adminOfRecord = async (client: WalletClient): Promise<Address> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "adminOfRecord",
        args: []
    }) as Promise<Address>;
}

/**
 * Whether the admin's powers are suspended protocol-wide. True and a pending
 * nomination are separate reasons for `_eSIMWalletAdmin` to read zero, so read
 * this alongside `_newRequestedAdmin` to tell them apart.
 */
export const _adminDisabled = async (client: WalletClient): Promise<boolean> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "adminDisabled",
        args: []
    }) as Promise<boolean>;
}

/**
 * Whether the protocol is paused. While true, the purchase and token-pull
 * paths on the device wallets and eSIM wallets revert `ProtocolPaused`.
 */
export const _paused = async (client: WalletClient): Promise<boolean> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "paused",
        args: []
    }) as Promise<boolean>;
}

/**
 * The fallback price ceiling in USD cents, applied to any eSIM wallet holding no
 * cap of its own. Never zero.
 */
export const _defaultPriceCapUSDCents = async (client: WalletClient): Promise<bigint> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "defaultPriceCapUSDCents",
        args: []
    }) as Promise<bigint>;
}

/** The vault EOA recorded in the registry. */
export const _vault = async (client: WalletClient): Promise<Address> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "vault",
        args: []
    }) as Promise<Address>;
}

/** The pending admin nominated via `requestAdminUpdate` (zero address if none). */
export const _newRequestedAdmin = async (client: WalletClient): Promise<Address> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "newRequestedAdmin",
        args: []
    }) as Promise<Address>;
}

/**
 * Who holds `onlyOwner` on the registry. On the live deployment this is the
 * `ProtocolAdmin` timelock, so an owner call sent from an EOA reverts and has to
 * be scheduled instead.
 */
export const _owner = async (client: WalletClient): Promise<Address> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "owner",
        args: []
    }) as Promise<Address>;
}

/** The upgrade-manager (owner) EOA recorded in the registry. */
export const _upgradeManager = async (client: WalletClient): Promise<Address> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "upgradeManager",
        args: []
    }) as Promise<Address>;
}

/**
 * The address a `transferOwnership` is waiting on. Worth reading before
 * `protocolAdmin.acceptOwnershipBatch`, which reverts on any target that has not
 * been offered to the timelock.
 */
export const _pendingOwner = async (client: WalletClient): Promise<Address> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "pendingOwner",
        args: []
    }) as Promise<Address>;
}

/** The `DeviceWalletFactory` address wired into the registry. */
export const _deviceWalletFactory = async (client: WalletClient): Promise<Address> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "deviceWalletFactory",
        args: []
    }) as Promise<Address>;
}

/** The `ESIMWalletFactory` address wired into the registry. */
export const _eSIMWalletFactory = async (client: WalletClient): Promise<Address> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "eSIMWalletFactory",
        args: []
    }) as Promise<Address>;
}

/** The EntryPoint the registry recognises. One per chain. */
export const _entryPoint = async (client: WalletClient): Promise<Address> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "entryPoint",
        args: []
    }) as Promise<Address>;
}

/**
 * The same pause check the wallets themselves run, which throws rather than
 * returning false. Use `_paused` to branch on it; use this when you want the
 * failure to carry the protocol's own revert reason.
 */
export const _requireNotPaused = async (client: WalletClient): Promise<void> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    await client.extend(publicActions).readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "requireNotPaused",
        args: []
    });
}

/** The `LazyWalletRegistry` address wired into the registry. */
export const _lazyWalletRegistry = async (client: WalletClient): Promise<Address> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "lazyWalletRegistry",
        args: []
    }) as Promise<Address>;
}

/** The device wallet registered for a device unique identifier (zero if none). */
export const _uniqueIdentifierToDeviceWallet = async (client: WalletClient, deviceIdentifier: string): Promise<Address> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "uniqueIdentifierToDeviceWallet",
        args: [deviceIdentifier]
    }) as Promise<Address>;
}

/**
 * One of a device wallet's two P-256 owner keys. The on-chain getter for the
 * `bytes32[2]` array takes the element index (`0` or `1`) and returns one key.
 */
export const _deviceWalletToOwner = async (client: WalletClient, deviceWallet: Address, index: bigint): Promise<Hex> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "deviceWalletToOwner",
        args: [deviceWallet, index]
    }) as Promise<Hex>;
}

/** The device wallet registered for a hash of owner P-256 keys (zero if none). */
export const _registeredP256Keys = async (client: WalletClient, hashOfOwnerP256Keys: Hex): Promise<Address> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "registeredP256Keys",
        args: [hashOfOwnerP256Keys]
    }) as Promise<Address>;
}

/** Whether a device wallet is registered/valid. */
export const _isDeviceWalletValid = async (client: WalletClient, deviceWallet: Address): Promise<boolean> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "isDeviceWalletValid",
        args: [deviceWallet]
    }) as Promise<boolean>;
}

/**
 * The device wallet an eSIM wallet is registered against, zero if the protocol
 * never deployed it. Despite the name this returns an address, not a boolean.
 *
 * This is a registration record, not a current holder. Once it goes non-zero it
 * stays non-zero for the rest of the wallet's life, and mid-transfer it still
 * names the device wallet that last held it. To ask who holds it now, read
 * `DeviceWallet.isValidESIMWallet` on the device wallet.
 */
export const _isESIMWalletValid = async (client: WalletClient, eSIMWallet: Address): Promise<Address> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "isESIMWalletValid",
        args: [eSIMWallet]
    }) as Promise<Address>;
}

/**
 * Whether a transfer is outstanding on an eSIM wallet. `bindESIMWallet` clears
 * it once the new device wallet takes the eSIM wallet on.
 *
 * Independent of `isESIMWalletValid`, and neither implies the other. A `true`
 * here is not a claim the wallet left the protocol, and it is normal for the
 * association to still name the device wallet that raised the flag. Do not use
 * this to decide whether an eSIM wallet belongs to the protocol.
 */
export const _isESIMWalletOnStandby = async (client: WalletClient, eSIMWallet: Address): Promise<boolean> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "isESIMWalletOnStandby",
        args: [eSIMWallet]
    }) as Promise<boolean>;
}

/**
 * Whether a device identifier already has a wallet on chain. Not the same
 * question as `lazyWalletRegistry.isDeviceIdentifierReserved`, which reads true
 * as soon as history is recorded and well before anything is deployed.
 */
export const _isDeviceIdentifierAlreadyUsed = async (client: WalletClient, deviceUniqueIdentifier: string): Promise<boolean> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "isDeviceIdentifierAlreadyUsed",
        args: [deviceUniqueIdentifier]
    }) as Promise<boolean>;
}

/** Whether an eSIM identifier is already held by a wallet. */
export const _isESIMIdentifierClaimed = async (client: WalletClient, eSIMUniqueIdentifier: string): Promise<boolean> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "isESIMIdentifierClaimed",
        args: [eSIMUniqueIdentifier]
    }) as Promise<boolean>;
}

/**
 * The one eSIM wallet holding an eSIM identifier, zero if nobody holds it. Set
 * once and never cleared, an ownership transfer included, because the eSIM
 * belongs to the wallet rather than to whichever device is holding it.
 */
export const _eSIMWalletForIdentifier = async (client: WalletClient, eSIMUniqueIdentifier: string): Promise<Address> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "eSIMWalletForIdentifier",
        args: [eSIMUniqueIdentifier]
    }) as Promise<Address>;
}

/**
 * The same answer as `_eSIMWalletForIdentifier`, keyed by the keccak256 of the
 * identifier. Use it when the hash is what you already have; otherwise take the
 * string version and skip the hashing.
 */
export const _claimedESIMIdentifiers = async (client: WalletClient, hashOfESIMIdentifier: Hex): Promise<Address> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "claimedESIMIdentifiers",
        args: [hashOfESIMIdentifier]
    }) as Promise<Address>;
}

/**
 * The check `DeviceWalletFactory` runs before taking a device identifier.
 * Resolves if the identifier is free, reverts `DeviceIdentifierReservedForLazyWallet`
 * if a fiat user's eSIMs are already waiting on it.
 *
 * Worth calling ahead of a deployment: taking a reserved identifier strands the
 * lazy user, since the history copy, the wallet deployment and the device switch
 * all then refuse it.
 */
export const _requireDeviceIdentifierNotReserved = async (client: WalletClient, deviceUniqueIdentifier: string): Promise<void> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    await client.extend(publicActions).readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "requireDeviceIdentifierNotReserved",
        args: [deviceUniqueIdentifier]
    });
}

/**
 * The ERC-1822 storage slot this proxy keeps its implementation in. An upgrade
 * reverts unless the incoming implementation answers with the same value, which
 * is what stops a non-UUPS address being installed.
 */
export const _proxiableUUID = async (client: WalletClient): Promise<Hex> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "proxiableUUID",
        args: []
    }) as Promise<Hex>;
}

/** The OpenZeppelin upgrade interface this proxy speaks, currently `"5.0.0"`. */
export const _upgradeInterfaceVersion = async (client: WalletClient): Promise<string> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "UPGRADE_INTERFACE_VERSION",
        args: []
    }) as Promise<string>;
}

/** The payment adapter this registry currently points at. */
export const _paymentAdapter = async (client: WalletClient): Promise<Address> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "paymentAdapter",
        args: []
    }) as Promise<Address>;
}

/**
 * Whether a payment reference has already been spent for an eSIM wallet.
 * Scoped per wallet: pass the same `keccak256(abi.encode(eSIMWallet, paymentReference))`
 * the contract keys `usedPaymentReferences` by, not the bare reference.
 */
export const _usedPaymentReferences = async (client: WalletClient, scopedReference: Hex): Promise<boolean> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "usedPaymentReferences",
        args: [scopedReference]
    }) as Promise<boolean>;
}
