import { Address, Hex, WalletClient, publicActions } from "viem";
import { _getChainSpecificConstants } from "../../constants.js";
import { ESIMWalletFactory } from "../../../abis/index.js";

// Read-only admin logic for `ESIMWalletFactory` - its public storage getter and
// `view` function, surfaced for the backend. Each read extends the `WalletClient`
// with `publicActions` (no EOA account required).

/** Whether an eSIM wallet was deployed by this factory. */
export const _isESIMWalletDeployed = async (client: WalletClient, eSIMWallet: Address): Promise<boolean> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.ESIM_WALLET_FACTORY,
        abi: ESIMWalletFactory,
        functionName: "isESIMWalletDeployed",
        args: [eSIMWallet]
    }) as Promise<boolean>;
}

/** The current eSIM-wallet beacon implementation. */
export const _getCurrentESIMWalletImplementation = async (client: WalletClient): Promise<Address> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.ESIM_WALLET_FACTORY,
        abi: ESIMWalletFactory,
        functionName: "getCurrentESIMWalletImplementation",
        args: []
    }) as Promise<Address>;
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
        address: values.factoryAddresses.ESIM_WALLET_FACTORY,
        abi: ESIMWalletFactory,
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
        address: values.factoryAddresses.ESIM_WALLET_FACTORY,
        abi: ESIMWalletFactory,
        functionName: "UPGRADE_INTERFACE_VERSION",
        args: []
    }) as Promise<string>;
}

/**
 * Who holds `onlyOwner` here. On the live deployment this is the
 * `ProtocolAdmin` timelock, so an owner call sent from an EOA reverts and has to
 * be scheduled instead.
 */
export const _owner = async (client: WalletClient): Promise<Address> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.ESIM_WALLET_FACTORY,
        abi: ESIMWalletFactory,
        functionName: "owner",
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
        address: values.factoryAddresses.ESIM_WALLET_FACTORY,
        abi: ESIMWalletFactory,
        functionName: "pendingOwner",
        args: []
    }) as Promise<Address>;
}
