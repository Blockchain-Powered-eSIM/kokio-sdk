import { Address, Hex, WalletClient } from "viem";
import { Asset } from "../../types.js";
import {
    _registry,
    _settlementToken,
    _assets,
    _resolveAsset,
    _quote,
    _usedReferences,
    _upgradeManager
} from "../../logic/admin/reads/paymentAdapter.reads.js";
import {
    _registerAsset,
    _updateAsset,
    _registerAssetCall,
    _updateAssetCall,
    _transferOwnershipCall,
    _upgradeCall,
    _acceptOwnership
} from "../../logic/admin/paymentAdapter.eoa.js";

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

    // Direct writes - only succeed if this wallet client is the owner. On the
    // live deployment the owner is the ProtocolAdmin timelock, so these revert
    // there; use the *Call builders below with `protocolAdmin.schedule` instead.

    registerAsset(symbol: Hex, asset: Asset) {
        return _registerAsset(this.walletClient, symbol, asset);
    }

    updateAsset(symbol: Hex, asset: Asset) {
        return _updateAsset(this.walletClient, symbol, asset);
    }

    acceptOwnership() {
        return _acceptOwnership(this.walletClient);
    }

    // Owner payloads - build an OwnerCall to hand to protocolAdmin.schedule.

    registerAssetCall(symbol: Hex, asset: Asset) {
        return _registerAssetCall(this.walletClient, symbol, asset);
    }

    updateAssetCall(symbol: Hex, asset: Asset) {
        return _updateAssetCall(this.walletClient, symbol, asset);
    }

    transferOwnershipCall(newOwner: Address) {
        return _transferOwnershipCall(this.walletClient, newOwner);
    }

    upgradeCall(newImplementation: Address, data?: Hex) {
        return _upgradeCall(this.walletClient, newImplementation, data);
    }
}
