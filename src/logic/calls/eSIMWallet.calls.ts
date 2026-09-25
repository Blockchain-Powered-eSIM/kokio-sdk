import { Address, Client, Hex, PublicActions, encodeFunctionData, erc20Abi } from "viem";
import { Call, DataBundleDetails } from "../../types.js";
import { ESIMWallet, PaymentAdapter, Registry } from "../../abis/index.js";
import { _chainId, _getChainSpecificConstants } from "../constants.js";

// Builds the calls a device wallet signs as one user operation, without sending
// anything. The mobile surface sends them straight away; the backend hands them
// to the app to sign.

/** Any client that can read contracts: the mobile smart account client, or a wallet client extended with `publicActions`. */
export type CallBuilderClient = Pick<PublicActions, "readContract" | "getChainId"> & Pick<Client, "transport">;

/**
 * The calls for buying a data bundle with tokens the device wallet sends over
 * in the same user operation, so the eSIM wallet needs no access to the device
 * wallet's funds.
 *
 * Only the shortfall is sent: the quote for the bundle minus what the eSIM
 * wallet already holds of `asset`, worked out when this runs. If that balance
 * or the quote changes before the operation lands, it reverts, so build the
 * calls again rather than resending old ones.
 */
export const _buyDataBundleWithTransferCalls = async (
    client: CallBuilderClient,
    eSIMWalletAddress: Address,
    dataBundleDetails: DataBundleDetails,
    asset: Hex,
    maxAmountIn: bigint,
    paymentReference: Hex
): Promise<Call[]> => {

    const chainID = await _chainId(client);
    const values = _getChainSpecificConstants(chainID, client.transport.url);

    // The eSIM wallet pays through whichever adapter the registry names, so read it there.
    const adapter = await client.readContract({
        address: values.factoryAddresses.REGISTRY, abi: Registry, functionName: "paymentAdapter"
    }) as Address;
    const [{ token }, amountIn] = await Promise.all([
        client.readContract({
            address: adapter, abi: PaymentAdapter, functionName: "resolveAsset", args: [asset]
        }) as Promise<{ token: Address }>,
        client.readContract({
            address: adapter, abi: PaymentAdapter, functionName: "quote", args: [asset, dataBundleDetails.priceUSDCents]
        }) as Promise<bigint>,
    ]);
    const held = await client.readContract({
        address: token, abi: erc20Abi, functionName: "balanceOf", args: [eSIMWalletAddress]
    });

    const buy = {
        to: eSIMWalletAddress,
        data: encodeFunctionData({
            abi: ESIMWallet,
            functionName: "buyDataBundleWithToken",
            args: [dataBundleDetails, asset, maxAmountIn, paymentReference]
        })
    };

    if (held >= amountIn) return [buy];

    return [
        {
            to: token,
            data: encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [eSIMWalletAddress, amountIn - held] })
        },
        buy
    ];
}
