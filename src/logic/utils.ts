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