import { describe, it, expect } from "vitest";
import { Hex, pad } from "viem";
import {
  PaymentReferenceKind,
  _parsePaymentReference,
  _tagPaymentReference,
} from "../../../src/logic/admin/utils/paymentReference.js";
import { InvalidPaymentReferenceError } from "../../../src/logic/errors.js";

// What the backend sends: a 12-byte Mongo ObjectId left-padded to 32 bytes.
const ORDER = "65f1a2b3c4d5e6f708192a3b";
const BASE = pad(`0x${ORDER}`, { size: 32 });

describe("_tagPaymentReference", () => {
  it("writes each kind's tag in front of the order id", () => {
    const zeros = (n: number) => "0".repeat(n);
    expect(_tagPaymentReference(BASE, PaymentReferenceKind.Standard)).toBe(BASE);
    expect(_tagPaymentReference(BASE, PaymentReferenceKind.Coupon)).toBe(`0xfee0ff${zeros(34)}${ORDER}`);
    expect(_tagPaymentReference(BASE, PaymentReferenceKind.CouponPart)).toBe(`0xfee0ffc0de${zeros(30)}${ORDER}`);
    expect(_tagPaymentReference(BASE, PaymentReferenceKind.Remainder)).toBe(`0xfee0ffba1a5ce0${zeros(26)}${ORDER}`);
  });

  it("gives the two halves of a split purchase different references", () => {
    expect(_tagPaymentReference(BASE, PaymentReferenceKind.CouponPart))
      .not.toBe(_tagPaymentReference(BASE, PaymentReferenceKind.Remainder));
  });

  it("refuses a reference that is already tagged", () => {
    const tagged = _tagPaymentReference(BASE, PaymentReferenceKind.Coupon);
    expect(() => _tagPaymentReference(tagged, PaymentReferenceKind.Remainder)).toThrow(InvalidPaymentReferenceError);
  });

  it("refuses an empty order part, a short reference and non-hex", () => {
    expect(() => _tagPaymentReference(pad("0x", { size: 32 }), PaymentReferenceKind.Coupon)).toThrow(InvalidPaymentReferenceError);
    expect(() => _tagPaymentReference(`0x${ORDER}`, PaymentReferenceKind.Coupon)).toThrow(InvalidPaymentReferenceError);
    expect(() => _tagPaymentReference("0xzz" as Hex, PaymentReferenceKind.Coupon)).toThrow(InvalidPaymentReferenceError);
  });
});

describe("_parsePaymentReference", () => {
  it("reads back every kind and the untagged reference", () => {
    for (const kind of Object.values(PaymentReferenceKind)) {
      expect(_parsePaymentReference(_tagPaymentReference(BASE, kind))).toEqual({ kind, reference: BASE });
    }
  });

  it("accepts uppercase hex", () => {
    const tagged = _tagPaymentReference(BASE, PaymentReferenceKind.Remainder);
    expect(_parsePaymentReference(`0x${tagged.slice(2).toUpperCase()}`))
      .toEqual({ kind: PaymentReferenceKind.Remainder, reference: BASE });
  });

  it("refuses a tag it did not write", () => {
    const unknown = `0xfee0ff01${"0".repeat(32)}${ORDER}` as Hex;
    expect(() => _parsePaymentReference(unknown)).toThrow(InvalidPaymentReferenceError);
  });
});
