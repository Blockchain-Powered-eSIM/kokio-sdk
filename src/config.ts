import { PublicClient, WalletClient } from "viem";
import { ConstantsSubPackage } from "./interface/constantsClass";
import { ContractsSubPackage } from "./interface/contractsClass";

export class kokio {
    client: WalletClient | PublicClient;
    constants: ConstantsSubPackage;
    contracts: ContractsSubPackage;

    constructor(
        client: WalletClient | PublicClient
    ) {
        this.client = client;
        this.constants = new ConstantsSubPackage(this.client);
        this.contracts = new ContractsSubPackage(this.client);
    }
}