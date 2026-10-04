import { describe, it, expect, type Mock } from "vitest";
import { encodeAbiParameters, keccak256, pad, stringToHex, type Address, type Hex } from "viem";

import { makeMockWalletClient } from "../../utils/mockClient.js";
import { baseSepoliaFactoryAddresses } from "../../../src/logic/constants.js";
import {
  CouponSplitOutOfRangeError,
  InvalidPaymentReferenceError,
  TransactionRevertedError,
} from "../../../src/logic/errors.js";
import { _recordSettledPurchase } from "../../../src/logic/admin/registry.eoa.js";
import { PaymentReferenceKind, _tagPaymentReference } from "../../../src/logic/admin/utils/paymentReference.js";
import { Settlement, type DataBundleDetails } from "../../../src/types.js";

// --- Fixtures ---------------------------------------------------------------
const F = baseSepoliaFactoryAddresses;
const CHAIN_ID = 84532;
const EOA = "0x00000000000000000000000000000000000e0a01" as Address;
const ESIM = "0x00000000000000000000000000000000000e51a1" as Address;

const ORDER = pad("0x65f1a2b3c4d5e6f708192a3b", { size: 32 });
const COUPON_REF = _tagPaymentReference(ORDER, PaymentReferenceKind.CouponPart);
const REMAINDER_REF = _tagPaymentReference(ORDER, PaymentReferenceKind.Remainder);
const REFS = [COUPON_REF, REMAINDER_REF] as const;

// A $10.00 bundle, $6.00 of it paid by coupon and $4.00 in USDC from an external wallet.
const BUNDLE: DataBundleDetails = {
  id: "0x0000000000000000000000000000000000000000000000000000000000000001",
  priceUSDCents: 1000n,
  settlement: Settlement.ExternalWallet,
};
const USDC = stringToHex("USDC", { size: 32 });
const USD = stringToHex("USD", { size: 32 });
const PAID = 4_000_000n;
const COUPON = 600n;

const REMAINDER_ARGS = [ESIM, { ...BUNDLE, priceUSDCents: 400n }, USDC, PAID, REMAINDER_REF];
const COUPON_ARGS = [ESIM, { id: BUNDLE.id, priceUSDCents: COUPON, settlement: Settlement.Fiat }, USD, COUPON, COUPON_REF];

const scoped = (ref: Hex) =>
  keccak256(encodeAbiParameters([{ type: "address" }, { type: "bytes32" }], [ESIM, ref]));

// A client whose registry reports `spent` references as already used for ESIM.
const clientWith = (spent: Hex[] = [], receiptStatus: "success" | "reverted" = "success") => makeMockWalletClient({
  chainId: CHAIN_ID,
  account: EOA,
  reads: { usedPaymentReferences: ([key]: [Hex]) => spent.some((ref) => scoped(ref) === key) },
  receipts: [{ logs: [], status: receiptStatus }],
});

// The mock client's methods are spies, which the WalletClient type does not show.
const spies = (client: ReturnType<typeof clientWith>) =>
  client as unknown as Record<"writeContract" | "readContract" | "waitForTransactionReceipt", Mock>;

const writes = (client: ReturnType<typeof clientWith>) =>
  spies(client).writeContract.mock.calls.map(([call]: Array<{ address: Address; functionName: string; args: unknown[] }>) => {
    expect(call.address).toBe(F.REGISTRY);
    expect(call.functionName).toBe("recordSettledPurchase");
    return call.args;
  });

describe("_recordSettledPurchase with a coupon split", () => {
  it("records the remainder line, waits for it, then records the coupon line", async () => {
    const client = clientWith();

    const hash = await _recordSettledPurchase(client, ESIM, BUNDLE, USDC, PAID, REFS, COUPON);

    expect(writes(client)).toEqual([REMAINDER_ARGS, COUPON_ARGS]);
    expect(spies(client).waitForTransactionReceipt).toHaveBeenCalledTimes(1);
    // The second hash the mock hands out, the coupon line's.
    expect(hash).toBe(`0x${"2".padStart(64, "0")}`);
  });

  it("sends only the coupon line when the remainder was recorded on an earlier try", async () => {
    const client = clientWith([REMAINDER_REF]);

    await _recordSettledPurchase(client, ESIM, BUNDLE, USDC, PAID, REFS, COUPON);

    expect(writes(client)).toEqual([COUPON_ARGS]);
    expect(spies(client).waitForTransactionReceipt).not.toHaveBeenCalled();
  });

  it("sends the remainder line again when both are recorded, for the contract to refuse", async () => {
    const client = clientWith([REMAINDER_REF, COUPON_REF]);

    await _recordSettledPurchase(client, ESIM, BUNDLE, USDC, PAID, REFS, COUPON);

    expect(writes(client)).toEqual([REMAINDER_ARGS]);
  });

  it("stops before the coupon line when the remainder line reverts", async () => {
    const client = clientWith([], "reverted");

    await expect(_recordSettledPurchase(client, ESIM, BUNDLE, USDC, PAID, REFS, COUPON))
      .rejects.toBeInstanceOf(TransactionRevertedError);
    expect(writes(client)).toEqual([REMAINDER_ARGS]);
  });

  it("refuses references that are not one order's coupon part and remainder, in that order", async () => {
    const otherOrder = pad("0x65f1a2b3c4d5e6f708192a3c", { size: 32 });
    const cases: Array<readonly [Hex, Hex]> = [
      [REMAINDER_REF, COUPON_REF],
      [COUPON_REF, ORDER],
      [COUPON_REF, _tagPaymentReference(otherOrder, PaymentReferenceKind.Remainder)],
    ];

    for (const refs of cases) {
      const client = clientWith();
      await expect(_recordSettledPurchase(client, ESIM, BUNDLE, USDC, PAID, refs, COUPON))
        .rejects.toBeInstanceOf(InvalidPaymentReferenceError);
      expect(spies(client).writeContract).not.toHaveBeenCalled();
    }
  });

  it("refuses a coupon that covers none or all of the price", async () => {
    for (const coupon of [undefined, 0n, -1n, 1000n, 1001n]) {
      const client = clientWith();
      await expect(_recordSettledPurchase(client, ESIM, BUNDLE, USDC, PAID, REFS, coupon))
        .rejects.toBeInstanceOf(CouponSplitOutOfRangeError);
      expect(spies(client).writeContract).not.toHaveBeenCalled();
    }
  });
});

describe("_recordSettledPurchase with a single reference", () => {
  it("sends it as given, without reading or checking its tag", async () => {
    const client = clientWith();
    const untagged = stringToHex("any-reference", { size: 32 });

    await _recordSettledPurchase(client, ESIM, BUNDLE, USDC, PAID, untagged);

    expect(writes(client)).toEqual([[ESIM, BUNDLE, USDC, PAID, untagged]]);
    expect(spies(client).readContract).not.toHaveBeenCalled();
  });
});
