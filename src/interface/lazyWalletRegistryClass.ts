import {
    _isLazyWalletDeployed
} from "../logic/lazyWalletRegistry.js"
import { SmartAccountClient } from "@aa-sdk/core";

export class LazyWalletRegistrySubPackage {

    client: SmartAccountClient;

    constructor(client: SmartAccountClient) {
        this.client = client;
    }

    isLazyWalletDeployed (deviceUniqueIdentifier: string) {
        return _isLazyWalletDeployed(this.client, deviceUniqueIdentifier);
    }
}
