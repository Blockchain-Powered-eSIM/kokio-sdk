import { WalletClient } from "viem";
import { _add0x, _getUserOpHash, _remove0x } from "../logic/utils";
import { AccountOp, SmartAccountClient } from "@aa-sdk/core";

export class UtilsSubPackage {

    client; 
    
    constructor(client: WalletClient) {
        this.client = client;
    }

    add0x(data: string) {
        _add0x(data);
    }

    remove0x(data: string) {
        _remove0x(data);
    }

    getUserOpHash(uo: AccountOp, smartAccountClient: SmartAccountClient) {
        _getUserOpHash(uo, smartAccountClient);
    }
    
}