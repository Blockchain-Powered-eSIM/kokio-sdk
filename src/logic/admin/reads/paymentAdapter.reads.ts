import { Address, Hex, WalletClient, publicActions } from "viem";
import { _getChainSpecificConstants } from "../../constants.js";
import { PaymentAdapter } from "../../../abis/index.js";
import { Asset } from "../../../types.js";

// Read-only admin logic for `PaymentAdapter`. Every write on it
// (registerAsset/updateAsset) is `onlyOwner`, i.e. only reachable through the
// timelock, so those live as payload builders on `KokioAdmin.protocolAdmin`
// rather than here.

/** The registry this adapter reads `vault()` and `isESIMWalletValid()` from. */
export const _registry = async (client: WalletClient): Promise<Address> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.PAYMENT_ADAPTER,
        abi: PaymentAdapter,
        functionName: "registry",
        args: []
    }) as Promise<Address>;
}

/** The ERC-20 registered under the `USDC` symbol at configure time. */
export const _settlementToken = async (client: WalletClient): Promise<Address> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.PAYMENT_ADAPTER,
        abi: PaymentAdapter,
        functionName: "settlementToken",
        args: []
    }) as Promise<Address>;
}

/**
 * The raw currency table entry for a symbol. `decimals` reads zero for a symbol
 * never registered, which is how `resolveAsset` tells "not registered" apart
 * from "registered but withdrawn" (`allowed: false`).
 */
export const _assets = async (client: WalletClient, symbol: Hex): Promise<Asset> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    const [allowed, isDollarUnit, decimals, token] = await client.extend(publicActions).readContract({
        address: values.factoryAddresses.PAYMENT_ADAPTER,
        abi: PaymentAdapter,
        functionName: "assets",
        args: [symbol]
    });

    return { allowed, isDollarUnit, decimals, token };
}

/** A currency's full entry, reverting if the symbol was never registered. */
export const _resolveAsset = async (client: WalletClient, symbol: Hex): Promise<Asset> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.PAYMENT_ADAPTER,
        abi: PaymentAdapter,
        functionName: "resolveAsset",
        args: [symbol]
    }) as Promise<Asset>;
}

/**
 * The amount of `symbol`, in its smallest unit, that a `priceUSDCents` charge
 * currently costs. Worth reading before `recordSettledPurchase`, to size
 * `_tokenAmount` for the backend's own settlement record.
 */
export const _quote = async (client: WalletClient, symbol: Hex, priceUSDCents: bigint): Promise<bigint> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.PAYMENT_ADAPTER,
        abi: PaymentAdapter,
        functionName: "quote",
        args: [symbol, priceUSDCents]
    }) as Promise<bigint>;
}

/**
 * Whether a payment reference has already been spent here. Retired from the
 * registry's live purchase paths (`PaymentAdapter.consumePaymentReference` is
 * `onlyRegistry` but nothing calls it any more): replay protection now lives on
 * `Registry.usedPaymentReferences`, scoped per eSIM wallet. Kept for whatever
 * still reads the adapter's own record from before that move.
 */
export const _usedReferences = async (client: WalletClient, paymentReference: Hex): Promise<boolean> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.PAYMENT_ADAPTER,
        abi: PaymentAdapter,
        functionName: "usedReferences",
        args: [paymentReference]
    }) as Promise<boolean>;
}

/** The address holding upgrade authority over this adapter (its owner). */
export const _upgradeManager = async (client: WalletClient): Promise<Address> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.extend(publicActions).readContract({
        address: values.factoryAddresses.PAYMENT_ADAPTER,
        abi: PaymentAdapter,
        functionName: "upgradeManager",
        args: []
    }) as Promise<Address>;
}
