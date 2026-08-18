import { _getChainSpecificConstants } from "./constants.js";
import { KokioSmartAccountClient } from "../types.js";
import { Registry } from "../abis/index.js";

// Everything else on the registry is `onlyOwner` or `onlyESIMWalletAdmin`, so a
// device-wallet userOp always reverts. Those live on `KokioAdmin.registry`. Only
// the reads a device needs belong on this surface.

/**
 * True once the device has a wallet on chain. Note this is not the same question
 * as `LazyWalletRegistry.isDeviceIdentifierReserved`, which only says whether
 * history has been recorded for the device, and is true well before anything is
 * deployed.
 */
export const _isDeviceIdentifierAlreadyUsed = async (client: KokioSmartAccountClient, deviceUniqueIdentifier: string): Promise<boolean> => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    // A `view` - read it directly instead of spending a userOp.
    return client.readContract({
        address: values.factoryAddresses.REGISTRY,
        abi: Registry,
        functionName: "isDeviceIdentifierAlreadyUsed",
        args: [deviceUniqueIdentifier]
    }) as Promise<boolean>;
}
