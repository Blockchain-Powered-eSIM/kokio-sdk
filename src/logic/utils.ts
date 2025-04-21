import { Address, createPublicClient, getContract, Hex, http, isAddress, toHex } from "viem";
import { _getChainSpecificConstants, customErrors, ZERO } from "./constants.js"

export const _add0x = (data: Address | string): Address => {
    if(!data) {
        throw customErrors.NULL_OR_UNDEFINED_VALUE;
    }

    return (data.indexOf('0x') !== -1) ? isAddress(data)? data : `0x${data}` : `0x${data}`;
}

export const _remove0x = (data: Address | string): string => {
    if(!data) {
        throw customErrors.NULL_OR_UNDEFINED_VALUE;
    }

    return (data.indexOf('0x') !== -1) ? data.slice(2) : data;
}

export function _shouldRemoveLeadingZero(bytes: Uint8Array): boolean {
    return bytes[0] === 0x0 && (bytes[1] & (1 << 7)) !== 0;
}

export function _concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
    let pointer = 0;
    const totalLength = arrays.reduce((prev, curr) => prev + curr.length, 0);
  
    const toReturn = new Uint8Array(totalLength);
  
    arrays.forEach((arr) => {
      toReturn.set(arr, pointer);
      pointer += arr.length;
    });
  
    return toReturn;
}

export function base64UrlToBuffer(base64url: string): Buffer {
    const base64 = base64url
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd((base64url.length + 3) & ~3, "=");
    return Buffer.from(base64, "base64");
}

export function decodeClientDataJSON(base64url: string): any {
    const base64 = base64url
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd((base64url.length + 3) & ~3, "=");
    const jsonString = Buffer.from(base64, "base64").toString("utf-8");
    return JSON.parse(jsonString);
}

export function hexToArrayBuffer(hexString: string): ArrayBuffer {
    const cleanHex = hexString.startsWith("0x") ? hexString.slice(2) : hexString;
    const bytes = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
    }
    return bytes.buffer;
}

export function parseDEREncodedSignature(signature: Uint8Array): {
    r: string;
    s: string;
  } {
    let offset = 0;
    if (signature[offset++] !== 0x30) throw new Error("Invalid DER sequence");
  
    const length = signature[offset++];
    if (signature[offset++] !== 0x02) throw new Error("Expected integer for r");
  
    const rLen = signature[offset++];
    const r = signature.slice(offset, offset + rLen);
    offset += rLen;
  
    if (signature[offset++] !== 0x02) throw new Error("Expected integer for s");
    const sLen = signature[offset++];
    const s = signature.slice(offset, offset + sLen);
  
    return {
      r: Buffer.from(r).toString("hex"),
      s: Buffer.from(s).toString("hex"),
    };
}

