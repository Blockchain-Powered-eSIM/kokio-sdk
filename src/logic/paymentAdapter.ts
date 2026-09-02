import { Address, Hex } from "viem";
import { _getChainSpecificConstants } from "./constants.js";
import { KokioSmartAccountClient } from "../types.js";
import { Asset } from "../types.js";
import { PaymentAdapter } from "../abis/index.js";

// Every function here is a view. The adapter's only writes reachable from a
// userOp are `settle` (`onlyESIMWallet`, called from inside
// `eSIMWallet.buyDataBundleWithToken`, never directly) and
// `consumePaymentReference` (`onlyRegistry`), so neither is exposed on this
// surface. `registerAsset`/`updateAsset` are `onlyOwner`, reachable only through
// `KokioAdmin.protocolAdmin`'s timelock payloads.

/**
 * The registry this adapter reads `vault()` and `isESIMWalletValid()` from.
 */
export const _registry = async (client: KokioSmartAccountClient): Promise<Address> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.readContract({
        address: values.factoryAddresses.PAYMENT_ADAPTER,
        abi: PaymentAdapter,
        functionName: "registry",
        args: []
    }) as Promise<Address>;
}

/** The ERC-20 registered under the `USDC` symbol at configure time. */
export const _settlementToken = async (client: KokioSmartAccountClient): Promise<Address> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.readContract({
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
export const _assets = async (client: KokioSmartAccountClient, symbol: Hex): Promise<Asset> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    const [allowed, isDollarUnit, decimals, token] = await client.readContract({
        address: values.factoryAddresses.PAYMENT_ADAPTER,
        abi: PaymentAdapter,
        functionName: "assets",
        args: [symbol]
    });

    return { allowed, isDollarUnit, decimals, token };
}

/**
 * A currency's full entry, reverting if the symbol was never registered.
 * `_asset` is not required for `buyDataBundleWithToken`, but is worth reading
 * first: `token` being the zero address means the currency is fiat-only and the
 * purchase will revert with `AssetNotTransferable`.
 */
export const _resolveAsset = async (client: KokioSmartAccountClient, symbol: Hex): Promise<Asset> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.readContract({
        address: values.factoryAddresses.PAYMENT_ADAPTER,
        abi: PaymentAdapter,
        functionName: "resolveAsset",
        args: [symbol]
    }) as Promise<Asset>;
}

/**
 * The amount of `symbol`, in its smallest unit, that a `priceUSDCents` charge
 * currently costs. Read this before calling `buyDataBundleWithToken`, and pass
 * the result (or a value at least this large) as `_maxAmountIn`: nothing today
 * moves the price between the quote and the purchase, so the two always agree,
 * but the contract will not assume that on the caller's behalf.
 */
export const _quote = async (client: KokioSmartAccountClient, symbol: Hex, priceUSDCents: bigint): Promise<bigint> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.readContract({
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
export const _usedReferences = async (client: KokioSmartAccountClient, paymentReference: Hex): Promise<boolean> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.readContract({
        address: values.factoryAddresses.PAYMENT_ADAPTER,
        abi: PaymentAdapter,
        functionName: "usedReferences",
        args: [paymentReference]
    }) as Promise<boolean>;
}

/** The address holding upgrade authority over this adapter (its owner). */
export const _upgradeManager = async (client: KokioSmartAccountClient): Promise<Address> => {

    const chainID = await client.getChainId();
    const rpcURL = client.transport.url;
    const values = _getChainSpecificConstants(chainID, rpcURL);

    return client.readContract({
        address: values.factoryAddresses.PAYMENT_ADAPTER,
        abi: PaymentAdapter,
        functionName: "upgradeManager",
        args: []
    }) as Promise<Address>;
}
