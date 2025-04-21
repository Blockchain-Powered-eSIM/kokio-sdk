import { Address, WalletClient } from "viem";
import { ConstantsSubPackage } from "./interface/constantsClass.js";
import { smartAccountSubPackage } from "./interface/smartAccountClass.js";
import { deviceWalletFactorySubPackage } from "./interface/deviceWalletFactoryClass.js";
import { P256VerifierSubPackage } from "./interface/P256VerifierClass.js";
import { lazyWalletRegistrySubPackage } from "./interface/lazyWalletRegistryClass.js";
import { deviceWalletSubPackage } from "./interface/deviceWalletClass.js";
import { eSIMWalletSubPackage } from "./interface/eSIMWalletClass.js";
import { eSIMWalletFactorySubPackage } from "./interface/eSIMWalletFactoryClass.js";
import { SmartAccountClient } from "@aa-sdk/core";
import { TurnkeyClient } from "@turnkey/http";

export class kokio {
    client: WalletClient;
    turnkeyClient: TurnkeyClient;
    organizationId: string;
    constants: ConstantsSubPackage;
    smartAccount: smartAccountSubPackage;
    deviceWalletFactory?: deviceWalletFactorySubPackage;
    eSIMWalletFactory?: eSIMWalletFactorySubPackage;
    lazyWalletRegistry?: lazyWalletRegistrySubPackage;
    deviceWallet?: deviceWalletSubPackage;
    eSIMWallet?: eSIMWalletSubPackage;
    P256Verifier?: P256VerifierSubPackage;

    constructor(
        client: WalletClient,
        turnkeyClient: TurnkeyClient,
        organizationId: string,
        smartAccountClient?: SmartAccountClient,
        deviceWalletAddress?: Address,
        eSIMWalletAddress?: Address
    ) {
        this.client = client;
        this.turnkeyClient = turnkeyClient;
        this.organizationId = organizationId;
        this.constants = new ConstantsSubPackage(this.client);
        this.smartAccount = new smartAccountSubPackage(this.client, this.turnkeyClient, this.organizationId);
        this.deviceWalletFactory = smartAccountClient? new deviceWalletFactorySubPackage(smartAccountClient): undefined;
        this.eSIMWalletFactory = smartAccountClient? new eSIMWalletFactorySubPackage(smartAccountClient): undefined;
        this.lazyWalletRegistry = smartAccountClient? new lazyWalletRegistrySubPackage(smartAccountClient): undefined;
        this.P256Verifier = smartAccountClient? new P256VerifierSubPackage(smartAccountClient): undefined;
        this.deviceWallet = deviceWalletAddress && smartAccountClient? new deviceWalletSubPackage(smartAccountClient, deviceWalletAddress): undefined;
        this.eSIMWallet = eSIMWalletAddress && smartAccountClient? new eSIMWalletSubPackage(smartAccountClient, eSIMWalletAddress): undefined;
    }
}