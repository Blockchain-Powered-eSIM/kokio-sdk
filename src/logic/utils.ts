import { Address, isAddress } from "viem";
import { customErrors } from "./constants"

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