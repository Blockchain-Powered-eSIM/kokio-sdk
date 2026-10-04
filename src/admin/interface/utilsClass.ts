import { Address, Hash, Hex, TransactionReceipt, WalletClient } from "viem";
import { _verifyERC20Transfer, _verifyProtocolPayment } from "../../logic/admin/utils/tokenTransfer.js";
import {
    PaymentReferenceKind,
    _parsePaymentReference,
    _tagPaymentReference,
} from "../../logic/admin/utils/paymentReference.js";

/**
 * Checks what a mined transaction actually paid, and builds and reads payment
 * references. Nothing is sent. Pass a hash when it came from a user: a receipt
 * is used as given, so it must come from your own node.
 */
export class AdminUtilsSubPackage {

    walletClient: WalletClient;

    constructor(walletClient: WalletClient) {
        this.walletClient = walletClient;
    }

    /**
     * The purchases `eSIMWallet` paid for through the protocol in `symbol`
     * ("USDC", "USDCt"), with each one's `paymentReference` and price in cents.
     * Throws if the symbol is not an onchain currency on the payment adapter.
     */
    verifyProtocolPayment(transaction: Hash | TransactionReceipt, symbol: string, eSIMWallet: Address) {
        return _verifyProtocolPayment(this.walletClient, transaction, symbol, eSIMWallet);
    }

    /**
     * What `sender` sent `destination` directly in any ERC-20. The cents count
     * one token as one dollar, so they mean nothing for a token that is not.
     */
    verifyERC20Transfer(transaction: Hash | TransactionReceipt, token: Address, sender: Address, destination: Address) {
        return _verifyERC20Transfer(this.walletClient, transaction, token, sender, destination);
    }

    /**
     * Marks `reference` with how the purchase was paid for. Its high 20 bytes
     * must be zero. For a split purchase, tag the same reference once as
     * `CouponPart` and once as `Remainder`.
     */
    tagPaymentReference(reference: Hex, kind: PaymentReferenceKind) {
        return _tagPaymentReference(reference, kind);
    }

    /**
     * How a purchase was paid for, and the untagged reference it was built
     * from. Throws on a tag this SDK did not write.
     */
    parsePaymentReference(reference: Hex) {
        return _parsePaymentReference(reference);
    }
}
