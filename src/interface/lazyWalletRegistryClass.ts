import {
    _isLazyWalletDeployed
} from "../logic/lazyWalletRegistry.js"
import { KokioSmartAccountClient } from "../types.js";

export class LazyWalletRegistrySubPackage {

    client: KokioSmartAccountClient;

    constructor(client: KokioSmartAccountClient) {
        this.client = client;
    }

    isLazyWalletDeployed (deviceUniqueIdentifier: string) {
        return _isLazyWalletDeployed(this.client, deviceUniqueIdentifier);
    }
}
