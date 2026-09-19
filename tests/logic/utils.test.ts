import { describe, it, expect } from "vitest";
import {
  _add0x,
  _shouldRemoveLeadingZero,
  _concatUint8Arrays,
} from "../../src/logic/utils.js";

describe("_add0x", () => {
  it("prefixes bare hex and leaves 0x-prefixed input intact", () => {
    expect(_add0x("abcd")).toBe("0xabcd");
    expect(_add0x("0xabcd")).toBe("0xabcd");
  });

  it("throws on empty/undefined input", () => {
    expect(() => _add0x("")).toThrow();
    // @ts-expect-error exercising the runtime null guard
    expect(() => _add0x(undefined)).toThrow();
  });
});

describe("_shouldRemoveLeadingZero", () => {
  it("is true only for a leading 0x00 followed by a high bit", () => {
    expect(_shouldRemoveLeadingZero(new Uint8Array([0x00, 0x80]))).toBe(true);
    expect(_shouldRemoveLeadingZero(new Uint8Array([0x00, 0x7f]))).toBe(false);
    expect(_shouldRemoveLeadingZero(new Uint8Array([0x01, 0x80]))).toBe(false);
  });
});

describe("_concatUint8Arrays", () => {
  it("concatenates in order", () => {
    const out = _concatUint8Arrays([
      new Uint8Array([1, 2]),
      new Uint8Array([3]),
      new Uint8Array([4, 5]),
    ]);
    expect([...out]).toEqual([1, 2, 3, 4, 5]);
  });
});
