import { _getChainSpecificConstants } from "./constants.js";
import { KokioSmartAccountClient } from "../types.js";
import { Registry } from "../abis/index.js";

// batchPopulateHistory, deployLazyWalletAndSetESIMIdentifier and
// switchESIMIdentifierToNewDeviceIdentifier are all `onlyESIMWalletAdmin`, so a
// device-wallet userOp (msg.sender = the device wallet account) always reverts. They
// are exposed on `KokioAdmin.lazyWalletRegistry` instead. Only the `view` lookup
// belongs on this surface, exposed as a direct read.

/**
 * True once the device has a wallet on chain. The registry answers this, not the
 * lazy registry: `LazyWalletRegistry.isDeviceIdentifierReserved` only says whether
 * history has been recorded for the device, which is true well before anything is
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
