import { Address, encodeFunctionData } from "viem"
import { _getChainSpecificConstants } from "./constants.js";
import { MissingSmartWalletError } from "./errors.js";
import { SmartAccountClient } from "@aa-sdk/core";
import { ESIMWalletFactory } from "../abis/index.js";

// Not exposed on this surface:
//   - addRegistryAddress is `onlyOwner` (the upgradeManager EOA); exposed on
//     `KokioAdmin.eSIMWalletFactory` instead.
//   - a direct EOA call to `deployESIMWallet` always reverts: the modifier is
//     `onlyRegistryOrDeviceWalletFactoryOrDeviceWallet`, and a bare EOA is none of those.
// `deployESIMWalletWithUserOp` works because a registered device wallet passes
// `registry.isDeviceWalletValid(msg.sender)`, so the userOp sender satisfies the modifier.

export const _deployESIMWalletWithUserOp = async (client: SmartAccountClient, deviceWalletAddress: Address, salt: bigint) => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    if(!client.account) throw new MissingSmartWalletError()

    // UserOp - the device-wallet sender is a valid device wallet per the registry.
    return client.sendUserOperation({
        account: client.account,
        uo:{
            target: values.factoryAddresses.ESIM_WALLET_FACTORY,
            data: encodeFunctionData({
                abi: ESIMWalletFactory,
                functionName: "deployESIMWallet",
                args: [deviceWalletAddress, salt]
            })
        }
    });
}

export const _getCurrentESIMWalletImplementation = async (client: SmartAccountClient): Promise<Address> => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    // `getCurrentESIMWalletImplementation` is a `view` - read it directly instead of a userOp.
    return client.readContract({
        address: values.factoryAddresses.ESIM_WALLET_FACTORY,
        abi: ESIMWalletFactory,
        functionName: "getCurrentESIMWalletImplementation",
        args: []
    }) as Promise<Address>;
}
