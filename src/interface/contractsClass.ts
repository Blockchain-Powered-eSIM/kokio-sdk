import { WalletClient } from "viem";
import { getContractInstance } from "../logic/contracts";

export class ContractsSubPackage {

    constructor(client: WalletClient) {
        return  getContractInstance(client);
    }
}