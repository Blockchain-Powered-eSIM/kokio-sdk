import { Hex, concat, isHex, pad, size, slice } from "viem";
import { InvalidPaymentReferenceError } from "../../errors.js";

/** How a purchase was paid for, as written into its payment reference. */
export enum PaymentReferenceKind {
    /** Paid in full without a coupon. Carries no tag. */
    Standard = "Standard",
    /** Paid in full by a coupon. */
    Coupon = "Coupon",
    /** The coupon's share of a purchase split between a coupon and another payment. */
    CouponPart = "CouponPart",
    /** What the user paid on top of the coupon in a split purchase. */
    Remainder = "Remainder",
}

// The backend puts the order id in the low 12 bytes, leaving the high 20 free for a tag.
// Every coupon tag starts with 0xfee0ff ("fee off") so it stands out on an explorer.
const TAG_SIZE = 20;
const TAGS: Record<PaymentReferenceKind, Hex> = {
    [PaymentReferenceKind.Standard]: pad("0x", { size: TAG_SIZE }),
    [PaymentReferenceKind.Coupon]: pad("0xfee0ff", { size: TAG_SIZE, dir: "right" }),
    [PaymentReferenceKind.CouponPart]: pad("0xfee0ffc0de", { size: TAG_SIZE, dir: "right" }),
    [PaymentReferenceKind.Remainder]: pad("0xfee0ffba1a5ce0", { size: TAG_SIZE, dir: "right" }),
};

// Lowercased so a checksum-style or uppercase input compares equal to the tags above.
const _splitReference = (reference: Hex): { tag: Hex; order: Hex } => {
    if (!isHex(reference, { strict: true }) || size(reference) !== 32) {
        throw new InvalidPaymentReferenceError(reference, "is not 32 bytes of hex");
    }
    const lower = reference.toLowerCase() as Hex;
    const order = slice(lower, TAG_SIZE);
    // The contracts refuse a zero reference, and a tag would hide an empty order id from that check.
    if (BigInt(order) === 0n) throw new InvalidPaymentReferenceError(reference, "has an empty order part");

    return { tag: slice(lower, 0, TAG_SIZE), order };
};

/**
 * Writes `kind`'s tag into the high 20 bytes of `reference`, which must be zero
 * there. Tag both halves of a split purchase from the same reference, so each
 * spends once onchain and both still point at the same order.
 */
export const _tagPaymentReference = (reference: Hex, kind: PaymentReferenceKind): Hex => {
    const { tag, order } = _splitReference(reference);
    if (tag !== TAGS[PaymentReferenceKind.Standard]) {
        throw new InvalidPaymentReferenceError(reference, "is already tagged");
    }

    return concat([TAGS[kind], order]);
};

/**
 * Reads back how a purchase was paid for, and the untagged reference it was
 * built from. Throws on a tag this SDK did not write.
 */
export const _parsePaymentReference = (reference: Hex): { kind: PaymentReferenceKind; reference: Hex } => {
    const { tag, order } = _splitReference(reference);
    const kind = (Object.keys(TAGS) as PaymentReferenceKind[]).find((k) => TAGS[k] === tag);
    if (!kind) throw new InvalidPaymentReferenceError(reference, "has an unknown tag");

    return { kind, reference: pad(order, { size: 32 }) };
};
