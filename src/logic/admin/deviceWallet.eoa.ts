import { Address, WalletClient } from "viem";
import { _getChainSpecificConstants } from "../constants.js";
import { MissingEOAWalletError } from "../errors.js";
import { DeviceWallet } from "../../abis/index.js";

/**
 * Admin-EOA logic targeting a specific `DeviceWallet` instance (its address is
 * passed in — there is no single factory address). Both functions are admin
 * gated on chain (`deployESIMWallet` is `onlyESIMWalletAdmin`,
 * `setESIMUniqueIdentifierForAnESIMWallet` is `onlyESIMWalletAdminOrRegistry`),
 * so they cannot be driven from a device-wallet userOp and live on the EOA surface.
 */

/** Deploy a new eSIM wallet under a device wallet. `onlyESIMWalletAdmin`. */
export const _deployESIMWallet = async (
    client: WalletClient,
    deviceWalletAddress: Address,
    hasAccessToETH: boolean,
    salt: bigint
) => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    if (!client.account) throw new MissingEOAWalletError();

    return client.writeContract({
        address: deviceWalletAddress,
        chain: values.chain,
        account: client.account.address,
        abi: DeviceWallet,
        functionName: 'deployESIMWallet',
        args: [hasAccessToETH, salt]
    });
}

/** Bind an eSIM's unique identifier to its wallet. `onlyESIMWalletAdminOrRegistry`. */
export const _setESIMUniqueIdentifierForAnESIMWallet = async (
    client: WalletClient,
    deviceWalletAddress: Address,
    eSIMWalletAddress: Address,
    eSIMUniqueIdentifier: string
) => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    if (!client.account) throw new MissingEOAWalletError();

    return client.writeContract({
        address: deviceWalletAddress,
        chain: values.chain,
        account: client.account.address,
        abi: DeviceWallet,
        functionName: 'setESIMUniqueIdentifierForAnESIMWallet',
        args: [eSIMWalletAddress, eSIMUniqueIdentifier]
    });
}
