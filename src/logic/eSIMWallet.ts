import { Address, encodeFunctionData, maxUint256 } from "viem"
import { DataBundleDetails } from "../types.js";
import { KokioSmartAccountClient } from "../types.js";
import { MissingSmartWalletError } from "./errors.js";
import { ESIMWallet } from "../abis/index.js";
import { _defaultDataBundlePriceCap } from "./registry.js";

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
 * Cap what this eSIM wallet may be charged for one data bundle. Zero hands it
 * back to the registry's ceiling.
 *
 * `onlyDeviceWallet`, so it needs the user's own signature. That is the point:
 * the admin names the price on `buyDataBundle`, so it must not be able to raise
 * the ceiling on that price too. A handover clears the cap, and the new owner has
 * to set it again.
 */
export const _setDataBundlePriceCap = async (client: KokioSmartAccountClient, address: Address, cap: bigint) => {

    if(!client.account) throw new MissingSmartWalletError()

    // UserOp - `onlyDeviceWallet`.
    return client.sendUserOperation({
        account: client.account,
        calls: [{
            to: address,
            data: encodeFunctionData({
                abi: ESIMWallet,
                functionName: "setDataBundlePriceCap",
                args: [cap]
            })
        }]
    });
}

export const _buyDataBundle = async (client: KokioSmartAccountClient, address: Address, dataBundleDetails: DataBundleDetails) => {

    if(!client.account) throw new MissingSmartWalletError()

    // UserOp - `onlyDeviceWalletOrESIMWalletAdmin`; the owning device wallet may buy.
    return client.sendUserOperation({
        account: client.account,
        calls: [{
            to: address,
            data: encodeFunctionData({
                abi: ESIMWallet,
                functionName: "buyDataBundle",
                args: [dataBundleDetails]
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
 * The ceiling that actually applies to this wallet's next purchase, in wei.
 * Read it before naming a price on `buyDataBundle`, since a price above the
 * ceiling reverts.
 *
 * Resolved the way the contract resolves it. The wallet's own cap wins when it
 * has one. Zero there means "follow the registry", which is where a fresh wallet
 * and a newly handed-over wallet both start. A zero on both means no ceiling at
 * all, so this returns `maxUint256` rather than a zero that reads as "you may
 * not spend anything".
 *
 * That last case cannot happen on a live deployment: the registry refuses a zero
 * cap in both `initialize` and `setDefaultDataBundlePriceCap`. It is handled
 * because the contract's own check treats zero as unlimited, not because the
 * state is reachable.
 */
export const _dataBundlePriceCap = async (client: KokioSmartAccountClient, address: Address): Promise<bigint> => {

    const walletCap = await client.readContract({
        address,
        abi: ESIMWallet,
        functionName: "dataBundlePriceCap",
        args: []
    }) as bigint;

    if (walletCap !== 0n) return walletCap;

    const registryCap = await _defaultDataBundlePriceCap(client);

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
 * reverts, or track the count from the `DataBundleBought` and
 * `TransactionHistoryPopulated` events.
 */
export const _transactionHistory = async (client: KokioSmartAccountClient, address: Address, index: bigint): Promise<DataBundleDetails> => {

    const [dataBundleID, dataBundlePrice] = await client.readContract({
        address,
        abi: ESIMWallet,
        functionName: "transactionHistory",
        args: [index]
    }) as [string, bigint];

    return { dataBundleID, dataBundlePrice };
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
