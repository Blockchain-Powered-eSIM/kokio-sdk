import { Hex } from "viem";
import {
    _registry,
    _settlementToken,
    _assets,
    _resolveAsset,
    _quote,
    _usedReferences,
    _upgradeManager
} from "../logic/paymentAdapter.js"
import { KokioSmartAccountClient } from "../types.js";

export class PaymentAdapterSubPackage {

    client: KokioSmartAccountClient;

    constructor(client: KokioSmartAccountClient) {
        this.client = client;
    }

    registry () {
        return _registry(this.client);
    }

    settlementToken () {
        return _settlementToken(this.client);
    }

    assets (symbol: Hex) {
        return _assets(this.client, symbol);
    }

    resolveAsset (symbol: Hex) {
        return _resolveAsset(this.client, symbol);
    }

    quote (symbol: Hex, priceUSDCents: bigint) {
        return _quote(this.client, symbol, priceUSDCents);
    }

    usedReferences (paymentReference: Hex) {
        return _usedReferences(this.client, paymentReference);
    }

    upgradeManager () {
        return _upgradeManager(this.client);
    }
}
