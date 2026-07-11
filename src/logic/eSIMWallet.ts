import { Address, encodeFunctionData } from "viem"
import { DataBundleDetails } from "../types.js";
import { SmartAccountClient } from "@aa-sdk/core";
import { MissingSmartWalletError } from "./errors.js";
import { ESIMWallet } from "../abis/index.js";

// Not exposed on this surface:
//   - populateHistory is `onlyRegistry` — callable only by the registry contract.
//   - transferOwnership is a `pure` override that always reverts
//     ("Use acceptOwnershipTransfer instead."); use requestTransferOwnership /
//     acceptOwnershipTransfer instead.
// The functions below are `onlyDeviceWallet` (the eSIM wallet's owner IS the device
// wallet) or otherwise satisfiable by the device-wallet userOp sender, so they succeed.

export const _setESIMUniqueIdentifier = async (client: SmartAccountClient, address: Address, eSIMUniqueIdentifier: string) => {

    if(!client.account) throw new MissingSmartWalletError()

    // UserOp — `onlyDeviceWallet`.
    return client.sendUserOperation({
        account: client.account,
        uo:{
            target: address,
            data: encodeFunctionData({
                abi: ESIMWallet,
                functionName: "setESIMUniqueIdentifier",
                args: [eSIMUniqueIdentifier]
            })
        }
    });
}

export const _buyDataBundle = async (client: SmartAccountClient, address: Address, dataBundleDetails: DataBundleDetails) => {

    if(!client.account) throw new MissingSmartWalletError()

    // UserOp — `onlyDeviceWalletOrESIMWalletAdmin`; the owning device wallet may buy.
    return client.sendUserOperation({
        account: client.account,
        uo:{
            target: address,
            data: encodeFunctionData({
                abi: ESIMWallet,
                functionName: "buyDataBundle",
                args: [dataBundleDetails]
            })
        }
    });
}

// `owner()` is a `view` — read it directly instead of spending a userOp.
export const _owner = async (client: SmartAccountClient, address: Address): Promise<Address> => {
    return client.readContract({
        address,
        abi: ESIMWallet,
        functionName: "owner",
        args: []
    }) as Promise<Address>;
}

export const _requestTransferOwnership = async (client: SmartAccountClient, address: Address, newOwner: Address) => {

    if(!client.account) throw new MissingSmartWalletError()

    // UserOp — `onlyDeviceWallet`; the owning device wallet requests the transfer.
    return client.sendUserOperation({
        account: client.account,
        uo:{
            target: address,
            data: encodeFunctionData({
                abi: ESIMWallet,
                functionName: "requestTransferOwnership",
                args: [newOwner]
            })
        }
    });
}

export const _acceptOwnershipTransfer = async (client: SmartAccountClient, address: Address) => {
    if(!client.account) throw new MissingSmartWalletError()

    // UserOp — the caller must be the pending `newRequestedOwner` (the new device wallet).
    return client.sendUserOperation({
        account: client.account,
        uo:{
            target: address,
            data: encodeFunctionData({
                abi: ESIMWallet,
                functionName: "acceptOwnershipTransfer",
                args: []
            })
        }
    });
}

export const _sendETHToDeviceWallet = async (client: SmartAccountClient, address: Address, amount: bigint) => {

    if(!client.account) throw new MissingSmartWalletError()

    // UserOp — `onlyDeviceWallet`.
    return client.sendUserOperation({
        account: client.account,
        uo:{
            target: address,
            data: encodeFunctionData({
                abi: ESIMWallet,
                functionName: "sendETHToDeviceWallet",
                args: [amount]
            })
        }
    });
}
