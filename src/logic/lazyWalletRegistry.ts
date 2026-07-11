import { _getChainSpecificConstants } from "./constants.js";
import { SmartAccountClient } from "@aa-sdk/core";
import { LazyWalletRegistry } from "../abis/index.js";

// batchPopulateHistory, deployLazyWalletAndSetESIMIdentifier and
// switchESIMIdentifierToNewDeviceIdentifier are all `onlyESIMWalletAdmin`, so a
// device-wallet userOp (msg.sender = the device wallet account) always reverts. They
// are exposed on `KokioAdmin.lazyWalletRegistry` instead. Only the `view` lookup
// belongs on this surface, exposed as a direct read.

export const _isLazyWalletDeployed = async (client: SmartAccountClient, deviceUniqueIdentifier: string): Promise<boolean> => {

    const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

    // `isLazyWalletDeployed` is a `view` — read it directly instead of spending a userOp.
    return client.readContract({
        address: values.factoryAddresses.LAZY_WALLET_REGISTRY,
        abi: LazyWalletRegistry,
        functionName: "isLazyWalletDeployed",
        args: [deviceUniqueIdentifier]
    }) as Promise<boolean>;
}
