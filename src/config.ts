import { Address, WalletClient } from "viem";
import { ConstantsSubPackage } from "./interface/constantsClass";
import { ContractsSubPackage } from "./interface/contractsClass";
import { smartAccountSubPackage } from "./interface/smartAccountClass";
import { deviceWalletFactorySubPackage } from "./interface/deviceWalletFactoryClass";
import { P256VerifierSubPackage } from "./interface/P256VerifierClass";
import { lazyWalletRegistrySubPackage } from "./interface/lazyWalletRegistryClass";
import { deviceWalletSubPackage } from "./interface/deviceWalletClass";
import { eSIMWalletSubPackage } from "./interface/eSIMWalletClass";
import { eSIMWalletFactorySubPackage } from "./interface/eSIMWalletFactoryClass";

export class kokio {
    client: WalletClient;
    constants: ConstantsSubPackage;
    contracts: ContractsSubPackage;
    smartAccount: smartAccountSubPackage;
    deviceWalletFactory: deviceWalletFactorySubPackage;
    eSIMWalletFactory: eSIMWalletFactorySubPackage;
    lazyWalletRegistry: lazyWalletRegistrySubPackage;
    deviceWallet?: deviceWalletSubPackage;
    eSIMWallet?: eSIMWalletSubPackage;
    P256Verifier: P256VerifierSubPackage;

    constructor(
        client: WalletClient,
        deviceWalletAddress?: Address,
        eSIMWalletAddress?: Address
    ) {
        this.client = client;
        this.constants = new ConstantsSubPackage(this.client);
        this.contracts = new ContractsSubPackage(this.client);
        this.smartAccount = new smartAccountSubPackage(this.client);
        this.deviceWalletFactory = new deviceWalletFactorySubPackage(this.client);
        this.eSIMWalletFactory = new eSIMWalletFactorySubPackage(this.client);
        this.lazyWalletRegistry = new lazyWalletRegistrySubPackage(this.client);
        this.P256Verifier = new P256VerifierSubPackage(this.client);
        this.deviceWallet = deviceWalletAddress? new deviceWalletSubPackage(this.client, deviceWalletAddress): undefined;
        this.eSIMWallet = eSIMWalletAddress? new eSIMWalletSubPackage(this.client, eSIMWalletAddress): undefined;
    }
}