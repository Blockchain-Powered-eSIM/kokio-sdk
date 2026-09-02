import { Address, Hex, encodeFunctionData, maxUint256 } from "viem"
import { DataBundleDetails } from "../types.js";
import { KokioSmartAccountClient } from "../types.js";
import { MissingSmartWalletError } from "./errors.js";
import { ESIMWallet } from "../abis/index.js";
import { _defaultPriceCapUSDCents } from "./registry.js";

// Not exposed on this surface:
//   - populateHistory and setESIMUniqueIdentifier are `onlyRegistry` - callable
//     only by the registry contract. Naming an eSIM goes through
//     `admin.registry.assignESIMIdentifier` instead.
//   - transferOwnership is a `pure` override that always reverts
//     ("Use acceptOwnershipTransfer instead."); use requestTransferOwnership /
//     acceptOwnershipTransfer instead.
// The functions below are `onlyDeviceWallet` (the eSIM wallet's owner IS the device
// wallet) or otherwise satisfiable by the device-wallet userOp sender, so they succeed.

/**
 * Cap what this eSIM wallet may be charged for one data bundle, in USD cents.
 * Zero hands it back to the registry's ceiling.
 *
 * `onlyDeviceWallet`, so it needs the user's own signature. That is the point:
 * the admin names the price on `buyDataBundleWithToken`, so it must not be able
 * to raise the ceiling on that price too. A handover clears the cap, and the new
 * owner has to set it again.
 */
export const _setPriceCapUSDCents = async (client: KokioSmartAccountClient, address: Address, cap: bigint) => {

    if(!client.account) throw new MissingSmartWalletError()

    // UserOp - `onlyDeviceWallet`.
    return client.sendUserOperation({
        account: client.account,
        calls: [{
            to: address,
            data: encodeFunctionData({
                abi: ESIMWallet,
                functionName: "setPriceCapUSDCents",
                args: [cap]
            })
        }]
    });
}

/**
 * Buy a data bundle in `asset`, an ERC-20 the payment adapter accepts.
 *
 * `_maxAmountIn` is the most of `asset` the buyer will spend, in its smallest
 * unit - read it from `paymentAdapter.quote(asset, dataBundleDetails.priceUSDCents)`
 * first. `_paymentReference` ties this purchase to its offchain order and is
 * spendable once per eSIM wallet; the caller supplies it rather than the SDK
 * inventing one.
 */
export const _buyDataBundleWithToken = async (
    client: KokioSmartAccountClient,
    address: Address,
    dataBundleDetails: DataBundleDetails,
    asset: Hex,
    maxAmountIn: bigint,
    paymentReference: Hex
) => {

    if(!client.account) throw new MissingSmartWalletError()

    // UserOp - `onlyDeviceWalletOrESIMWalletAdmin`; the owning device wallet may buy.
    return client.sendUserOperation({
        account: client.account,
        calls: [{
            to: address,
            data: encodeFunctionData({
                abi: ESIMWallet,
                functionName: "buyDataBundleWithToken",
                args: [dataBundleDetails, asset, maxAmountIn, paymentReference]
            })
        }]
    });
}

/**
 * Send an ERC-20 held by this eSIM wallet back to its owning device wallet.
 * `onlyDeviceWallet`.
 */
export const _sendTokenToDeviceWallet = async (client: KokioSmartAccountClient, address: Address, token: Address, amount: bigint) => {

    if(!client.account) throw new MissingSmartWalletError()

    // UserOp - `onlyDeviceWallet`.
    return client.sendUserOperation({
        account: client.account,
        calls: [{
            to: address,
            data: encodeFunctionData({
                abi: ESIMWallet,
                functionName: "sendTokenToDeviceWallet",
                args: [token, amount]
            })
        }]
    });
}

// `owner()` is a `view` - read it directly instead of spending a userOp.
export const _owner = async (client: KokioSmartAccountClient, address: Address): Promise<Address> => {
    return client.readContract({
        address,
        abi: ESIMWallet,
        functionName: "owner",
        args: []
    }) as Promise<Address>;
}

/**
 * The ceiling that actually applies to this wallet's next purchase, in USD
 * cents. Read it before naming a price on `buyDataBundleWithToken`, since a
 * price above the ceiling reverts.
 *
 * Resolved the way the contract resolves it. The wallet's own cap wins when it
 * has one. Zero there means "follow the registry", which is where a fresh wallet
 * and a newly handed-over wallet both start. A zero on both means no ceiling at
 * all, so this returns `maxUint256` rather than a zero that reads as "you may
 * not spend anything".
 *
 * That last case cannot happen on a live deployment: the registry refuses a zero
 * cap in both `initialize` and `setDefaultPriceCapUSDCents`. It is handled
 * because the contract's own check treats zero as unlimited, not because the
 * state is reachable.
 */
export const _priceCapUSDCents = async (client: KokioSmartAccountClient, address: Address): Promise<bigint> => {

    const walletCap = await client.readContract({
        address,
        abi: ESIMWallet,
        functionName: "priceCapUSDCents",
        args: []
    }) as bigint;

    if (walletCap !== 0n) return walletCap;

    const registryCap = await _defaultPriceCapUSDCents(client);

    return registryCap === 0n ? maxUint256 : registryCap;
}

/**
 * The device wallet this eSIM wallet belongs to. Tracks `owner`, but it is its
 * own storage slot with its own getter, so read whichever one you mean.
 */
export const _deviceWallet = async (client: KokioSmartAccountClient, address: Address): Promise<Address> => {
    return client.readContract({
        address,
        abi: ESIMWallet,
        functionName: "deviceWallet",
        args: []
    }) as Promise<Address>;
}

/**
 * One data bundle purchase, by position. Holds every purchase this wallet has
 * made, and for a wallet that came off the fiat path it also holds the
 * pre-deployment purchases the lazy registry copies in.
 *
 * There is no length getter on the contract. Read upwards from zero until a call
 * reverts, or track the count from the `DataBundleBoughtWithToken`,
 * `DataBundleSettlementRecorded` and `TransactionHistoryPopulated` events.
 */
export const _transactionHistory = async (client: KokioSmartAccountClient, address: Address, index: bigint): Promise<DataBundleDetails> => {

    const [id, priceUSDCents, settlement] = await client.readContract({
        address,
        abi: ESIMWallet,
        functionName: "transactionHistory",
        args: [index]
    });

    return { id, priceUSDCents, settlement };
}

export const _requestTransferOwnership = async (client: KokioSmartAccountClient, address: Address, newOwner: Address) => {

    if(!client.account) throw new MissingSmartWalletError()

    // UserOp - `onlyDeviceWallet`; the owning device wallet requests the transfer.
    return client.sendUserOperation({
        account: client.account,
        calls: [{
            to: address,
            data: encodeFunctionData({
                abi: ESIMWallet,
                functionName: "requestTransferOwnership",
                args: [newOwner]
            })
        }]
    });
}

export const _acceptOwnershipTransfer = async (client: KokioSmartAccountClient, address: Address) => {
    if(!client.account) throw new MissingSmartWalletError()

    // UserOp - the caller must be the pending `newRequestedOwner` (the new device wallet).
    return client.sendUserOperation({
        account: client.account,
        calls: [{
            to: address,
            data: encodeFunctionData({
                abi: ESIMWallet,
                functionName: "acceptOwnershipTransfer",
                args: []
            })
        }]
    });
}

export const _sendETHToDeviceWallet = async (client: KokioSmartAccountClient, address: Address, amount: bigint) => {

    if(!client.account) throw new MissingSmartWalletError()

    // UserOp - `onlyDeviceWallet`.
    return client.sendUserOperation({
        account: client.account,
        calls: [{
            to: address,
            data: encodeFunctionData({
                abi: ESIMWallet,
                functionName: "sendETHToDeviceWallet",
                args: [amount]
            })
        }]
    });
}
