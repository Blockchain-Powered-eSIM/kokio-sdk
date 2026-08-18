import {
    _isDeviceIdentifierAlreadyUsed
} from "../logic/registry.js"
import { KokioSmartAccountClient } from "../types.js";

export class RegistrySubPackage {

    client: KokioSmartAccountClient;

    constructor(client: KokioSmartAccountClient) {
        this.client = client;
    }

    isDeviceIdentifierAlreadyUsed (deviceUniqueIdentifier: string) {
        return _isDeviceIdentifierAlreadyUsed(this.client, deviceUniqueIdentifier);
    }
}
