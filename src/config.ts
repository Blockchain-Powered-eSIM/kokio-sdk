import { Address, WalletClient } from "viem";
import { ConstantsSubPackage } from "./interface/constantsClass";
import { smartAccountSubPackage } from "./interface/smartAccountClass";
import { deviceWalletFactorySubPackage } from "./interface/deviceWalletFactoryClass";
import { P256VerifierSubPackage } from "./interface/P256VerifierClass";
import { lazyWalletRegistrySubPackage } from "./interface/lazyWalletRegistryClass";
import { deviceWalletSubPackage } from "./interface/deviceWalletClass";
import { eSIMWalletSubPackage } from "./interface/eSIMWalletClass";
import { eSIMWalletFactorySubPackage } from "./interface/eSIMWalletFactoryClass";
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