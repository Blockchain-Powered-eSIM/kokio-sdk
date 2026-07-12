import { Address, encodeFunctionData, getContract, WalletClient } from "viem";
import { SmartAccountClient } from "@aa-sdk/core";
import { DeviceWallet } from "../abis/index.js";
import { MissingSmartWalletError } from "./errors.js";
import { P256Key } from "../types.js";

// A userOp from a device wallet runs through `execute`, so at the target contract
// msg.sender is the device-wallet account itself. That constrains which DeviceWallet
// functions this surface can expose:
//   - deployESIMWallet / setESIMUniqueIdentifierForAnESIMWallet are `onlyESIMWalletAdmin`
//     / `onlyESIMWalletAdminOrRegistry` - only the admin EOA (or registry) may call, so a
//     device-wallet userOp always reverts. They are exposed on `KokioAdmin.deviceWallet`.
//   - payETHForDataBundles / pullETH are `onlyAssociatedESIMWallets` - callable only by an
//     associated eSIM wallet contract, never by the device wallet or an EOA.
// The functions below are self-callable (target = the device wallet's own address, so
// msg.sender == self), so they succeed via a userOp.

export const _toggleAccessToETH = async (client: SmartAccountClient, address: Address, eSIMWalletAddress: Address, hasAccessToETH: boolean) => {

    if(!client.account) throw new MissingSmartWalletError();

    // UserOp - `onlySelf`; the device wallet toggles ETH access for an eSIM wallet it owns.
    return client.sendUserOperation({
        account: client.account,
        uo:{
            target: address,
            data: encodeFunctionData({
                abi: DeviceWallet,
                functionName: "toggleAccessToETH",
                args: [eSIMWalletAddress, hasAccessToETH]
            })
        }
    });
}

export const _addESIMWallet = async (client: SmartAccountClient, address: Address, eSIMWalletAddress: Address, hasAccessToETH: boolean) => {

    if(!client.account) throw new MissingSmartWalletError();

    // UserOp - `onlyRegistryOrDeviceWalletFactoryOrOwner`; self is permitted.
    return client.sendUserOperation({
        account: client.account,
        uo:{
            target: address,
            data: encodeFunctionData({
                abi: DeviceWallet,
                functionName: "addESIMWallet",
                args: [eSIMWalletAddress, hasAccessToETH]
            })
        }
    });
}

export const _removeESIMWallet = async (client: SmartAccountClient, address: Address, eSIMWalletAddress: Address, hasAccessToETH: boolean) => {

    if(!client.account) throw new MissingSmartWalletError();

    // UserOp - `onlySelfOrAssociatedESIMWallet`; self is permitted.
    return client.sendUserOperation({
        account: client.account,
        uo:{
            target: address,
            data: encodeFunctionData({
                abi: DeviceWallet,
                functionName: "removeESIMWallet",
                args: [eSIMWalletAddress, hasAccessToETH]
            })
        }
    });
}

// `getVaultAddress` is a `view` - read it directly instead of spending a userOp.
export const _getVaultAddress = async (client: SmartAccountClient, address: Address): Promise<Address> => {
    return client.readContract({
        address,
        abi: DeviceWallet,
        functionName: "getVaultAddress",
        args: []
    }) as Promise<Address>;
}

export const _getOwner = async (client: WalletClient, address: Address) => {

    const contract = getContract({
        abi: DeviceWallet,
        address: address,
        client
    })

    const x = await contract.read.owner([0n]);
    const y = await contract.read.owner([1n]);

    const owner: P256Key = [x, y];
    return owner;
}
