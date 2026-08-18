import {
    _isDeviceIdentifierAlreadyUsed
} from "../logic/lazyWalletRegistry.js"
import { KokioSmartAccountClient } from "../types.js";

export class LazyWalletRegistrySubPackage {

    client: KokioSmartAccountClient;

    constructor(client: KokioSmartAccountClient) {
        this.client = client;
    }

    isDeviceIdentifierAlreadyUsed (deviceUniqueIdentifier: string) {
        return _isDeviceIdentifierAlreadyUsed(this.client, deviceUniqueIdentifier);
    }
}
