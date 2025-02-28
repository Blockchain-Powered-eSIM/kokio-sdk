import { PublicClient, WalletClient } from "viem";
import { getContractInstance } from "../logic/contracts";
import { _add0x, _remove0x } from "../logic/utils";

export class UtilsSubPackage {

    client; 
    
    constructor(client: WalletClient | PublicClient) {
        this.client = client;
    }

    add0x(data: string) {
        _add0x(data);
    }

    remove0x(data: string) {
        _remove0x(data);
    }
}