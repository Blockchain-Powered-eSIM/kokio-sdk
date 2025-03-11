import { WalletClient } from "viem";
import { ConstantsSubPackage } from "./interface/constantsClass";
import { ContractsSubPackage } from "./interface/contractsClass";
import { smartAccountSubPackage } from "./interface/smartAccountClass";

export class kokio {
    client: WalletClient;
    constants: ConstantsSubPackage;
    contracts: ContractsSubPackage;
    smartAccount: smartAccountSubPackage;

    constructor(
        client: WalletClient
    ) {
        this.client = client;
        this.constants = new ConstantsSubPackage(this.client);
        this.contracts = new ContractsSubPackage(this.client);
        this.smartAccount = new smartAccountSubPackage(this.client)
    }
}