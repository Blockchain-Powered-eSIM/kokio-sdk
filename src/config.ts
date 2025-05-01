import { Address, WalletClient } from "viem";
import { ConstantsSubPackage } from "./interface/constantsClass.js";
import { SmartAccountSubPackage } from "./interface/smartAccountClass.js";
import { DeviceWalletFactorySubPackage } from "./interface/deviceWalletFactoryClass.js";
import { P256VerifierSubPackage } from "./interface/P256VerifierClass.js";
import { LazyWalletRegistrySubPackage } from "./interface/lazyWalletRegistryClass.js";
import { DeviceWalletSubPackage } from "./interface/deviceWalletClass.js";
import { ESIMWalletSubPackage } from "./interface/eSIMWalletClass.js";
import { ESIMWalletFactorySubPackage } from "./interface/eSIMWalletFactoryClass.js";
import { TypesSubPackage } from "./interface/typesClass.js";
import { SmartAccountClient } from "@aa-sdk/core";
import { TurnkeyClient } from "@turnkey/http";

export class Kokio {
    viemWalletClient: WalletClient;
    turnkeyClient: TurnkeyClient;
    organizationId: string;

    types: TypesSubPackage;
    constants: ConstantsSubPackage;

    smartAccount: SmartAccountSubPackage;
    deviceWalletFactory?: DeviceWalletFactorySubPackage;
    eSIMWalletFactory?: ESIMWalletFactorySubPackage;
    lazyWalletRegistry?: LazyWalletRegistrySubPackage;
    deviceWallet?: DeviceWalletSubPackage;
    eSIMWallet?: ESIMWalletSubPackage;
    P256Verifier?: P256VerifierSubPackage;

    constructor(
        viemWalletClient: WalletClient,
        turnkeyClient: TurnkeyClient,
        organizationId: string,
        smartAccountClient?: SmartAccountClient,
        deviceWalletAddress?: Address,
        eSIMWalletAddress?: Address
    ) {
        this.viemWalletClient = viemWalletClient;
        this.turnkeyClient = turnkeyClient;
        this.organizationId = organizationId;

        this.types = new TypesSubPackage();
        this.constants = new ConstantsSubPackage(this.viemWalletClient);

        this.smartAccount = new SmartAccountSubPackage(this.viemWalletClient, this.turnkeyClient, this.organizationId);
        this.deviceWalletFactory = smartAccountClient? new DeviceWalletFactorySubPackage(viemWalletClient, smartAccountClient): undefined;
        this.eSIMWalletFactory = smartAccountClient? new ESIMWalletFactorySubPackage(viemWalletClient, smartAccountClient): undefined;
        this.lazyWalletRegistry = smartAccountClient? new LazyWalletRegistrySubPackage(smartAccountClient): undefined;
        this.P256Verifier = smartAccountClient? new P256VerifierSubPackage(smartAccountClient): undefined;
        this.deviceWallet = deviceWalletAddress && smartAccountClient? new DeviceWalletSubPackage(viemWalletClient, smartAccountClient, deviceWalletAddress): undefined;
        this.eSIMWallet = eSIMWalletAddress && smartAccountClient? new ESIMWalletSubPackage(smartAccountClient, eSIMWalletAddress): undefined;
    }
}
