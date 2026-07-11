import { describe, it, expect } from "vitest";
import {
  _add0x,
  _remove0x,
  _shouldRemoveLeadingZero,
  _concatUint8Arrays,
  base64UrlToBuffer,
  decodeClientDataJSON,
  hexToArrayBuffer,
  parseDEREncodedSignature,
  parseSignature,
} from "../../src/logic/utils.js";

describe("_add0x / _remove0x", () => {
  it("_add0x prefixes bare hex and leaves 0x-prefixed input intact", () => {
    expect(_add0x("abcd")).toBe("0xabcd");
    expect(_add0x("0xabcd")).toBe("0xabcd");
  });

  it("_remove0x strips a leading 0x and is a no-op otherwise", () => {
    expect(_remove0x("0xabcd")).toBe("abcd");
    expect(_remove0x("abcd")).toBe("abcd");
  });

  it("both throw on empty/undefined input", () => {
    expect(() => _add0x("")).toThrow();
    expect(() => _remove0x("")).toThrow();
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

describe("base64UrlToBuffer / decodeClientDataJSON", () => {
  it("round-trips base64url with url-safe chars and missing padding", () => {
    const json = '{"type":"webauthn.get","challenge":"abc"}';
    const b64url = Buffer.from(json, "utf-8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(base64UrlToBuffer(b64url).toString("utf-8")).toBe(json);
    expect(decodeClientDataJSON(b64url)).toEqual({
      type: "webauthn.get",
      challenge: "abc",
    });
  });
});

describe("hexToArrayBuffer", () => {
  it("parses hex with and without 0x prefix", () => {
    expect([...new Uint8Array(hexToArrayBuffer("0x0102ff"))]).toEqual([1, 2, 255]);
    expect([...new Uint8Array(hexToArrayBuffer("0102ff"))]).toEqual([1, 2, 255]);
  });
});

describe("DER signature parsing", () => {
  // A minimal DER SEQUENCE { INTEGER r, INTEGER s } with r=0x01, s=0x02
  const der = new Uint8Array([0x30, 0x06, 0x02, 0x01, 0x01, 0x02, 0x01, 0x02]);

  it("parseDEREncodedSignature extracts r and s hex", () => {
    expect(parseDEREncodedSignature(der)).toEqual({ r: "01", s: "02" });
  });

  it("parseSignature splits a 32-byte-integer DER into r and s", () => {
    // parseSignature assumes each ASN.1 integer is exactly 32 bytes and just
    // concatenates raw r||s. Build a DER with full 32-byte r/s (high bit clear
    // so no leading-zero byte is added).
    const rBytes = new Uint8Array(32).fill(0);
    rBytes[0] = 0x11;
    rBytes[31] = 0x01;
    const sBytes = new Uint8Array(32).fill(0);
    sBytes[0] = 0x22;
    sBytes[31] = 0x02;
    const der32 = new Uint8Array([
      0x30, 0x44,
      0x02, 0x20, ...rBytes,
      0x02, 0x20, ...sBytes,
    ]);

    const { r, s } = parseSignature(der32);
    expect(r).toBe("0x" + Buffer.from(rBytes).toString("hex"));
    expect(s).toBe("0x" + Buffer.from(sBytes).toString("hex"));
  });
});
