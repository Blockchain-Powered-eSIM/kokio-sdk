import { WalletClient } from "viem";
import { _getContractInstance } from "../logic/contracts";

export class ContractsSubPackage {

    constructor(client: WalletClient) {
        return  _getContractInstance(client);
    }
}