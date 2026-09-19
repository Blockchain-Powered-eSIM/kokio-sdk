import { Hex, isHex } from "viem";
import { NullOrUndefinedValueError } from "./errors.js"

export const _add0x = (data: Hex | string): Hex => {
    if(!data) {
        throw new NullOrUndefinedValueError();
    }

    return (data.indexOf('0x') !== -1) ? isHex(data)? data : `0x${data}` : `0x${data}`;
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
