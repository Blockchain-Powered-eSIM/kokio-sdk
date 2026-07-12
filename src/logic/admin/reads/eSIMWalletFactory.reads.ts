import { Address, WalletClient, publicActions } from "viem";
import { _getChainSpecificConstants } from "../../constants.js";
import { ESIMWalletFactory } from "../../../abis/index.js";

/**
 * Read-only admin logic for `ESIMWalletFactory` - its public storage getter and
 * `view` function, surfaced for the backend. Each read extends the `WalletClient`
 * with `publicActions` (no EOA account required).
 */

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
