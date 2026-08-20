import { Address, WalletClient } from "viem";
import { _getChainSpecificConstants } from "../constants.js";
import { MissingEOAWalletError } from "../errors.js";
import { DeviceWallet } from "../../abis/index.js";

// Admin-EOA logic targeting a specific `DeviceWallet` instance (its address is
// passed in - there is no single factory address). `deployESIMWallet` is
// `onlyESIMWalletAdmin` on chain, so it cannot be driven from a device-wallet
// userOp and lives on the EOA surface.

/**
 * Deploy a new eSIM wallet under a device wallet. `onlyESIMWalletAdmin`.
 *
 * The bind that follows never carries ETH access: the contract reverts on a
 * `true` rather than downgrading it quietly, so the SDK passes `false` and there
 * is nothing to choose. The owner grants access afterwards with
 * `toggleAccessToETH`, which the admin EOA cannot reach.
 */
export const _deployESIMWallet = async (
    client: WalletClient,
    deviceWalletAddress: Address,
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
        args: [false, salt]
    });
}

/**
 * Top up a device wallet's gas deposit at the EntryPoint, paid by the admin EOA.
 *
 * Open to anyone: paying another account's gas costs the payer and nobody else.
 * `withdrawDepositTo` is `onlySelf`, so only the wallet's owner can take it back
 * out, and topping one up is not a way to reach its funds.
 */
export const _addDeposit = async (client: WalletClient, deviceWalletAddress: Address, amount: bigint) => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    if (!client.account) throw new MissingEOAWalletError();

    return client.writeContract({
        address: deviceWalletAddress,
        chain: values.chain,
        account: client.account.address,
        abi: DeviceWallet,
        functionName: 'addDeposit',
        args: [],
        value: amount
    });
}
