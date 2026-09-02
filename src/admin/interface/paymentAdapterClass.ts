import { Hex, WalletClient } from "viem";
import {
    _registry,
    _settlementToken,
    _assets,
    _resolveAsset,
    _quote,
    _usedReferences,
    _upgradeManager
} from "../../logic/admin/reads/paymentAdapter.reads.js";

export class AdminPaymentAdapterSubPackage {

    walletClient: WalletClient;

    constructor(walletClient: WalletClient) {
        this.walletClient = walletClient;
    }

    registry() {
        return _registry(this.walletClient);
    }

    settlementToken() {
        return _settlementToken(this.walletClient);
    }

    assets(symbol: Hex) {
        return _assets(this.walletClient, symbol);
    }

    resolveAsset(symbol: Hex) {
        return _resolveAsset(this.walletClient, symbol);
    }

    quote(symbol: Hex, priceUSDCents: bigint) {
        return _quote(this.walletClient, symbol, priceUSDCents);
    }

    usedReferences(paymentReference: Hex) {
        return _usedReferences(this.walletClient, paymentReference);
    }

    upgradeManager() {
        return _upgradeManager(this.walletClient);
    }
}
