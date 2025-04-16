import { Address, createPublicClient, getContract, Hex, http, isAddress, toHex } from "viem";
import { _getChainSpecificConstants, customErrors, ZERO } from "./constants"
import { AccountOp, EntryPointAbi_v6, SmartAccountClient } from "@aa-sdk/core";
import { entryPoint06Address } from "viem/_types/constants/address";

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

export const _getUserOpHash = async (uo: AccountOp, smartAccountClient: SmartAccountClient): Promise<Hex> => {

  if (!smartAccountClient.account || !smartAccountClient.chain) 
    throw new Error('Error: Missing account or chain in Smart Wallet client')

  const chainID = smartAccountClient.chain?.id
  const values = _getChainSpecificConstants(chainID);

  const userOp = await smartAccountClient.buildUserOperation({
    uo: uo,
    account: smartAccountClient.account
  })

  const entryPointContract = getContract({
    abi: EntryPointAbi_v6,
    address: entryPoint06Address,
    client: createPublicClient({
      chain: values.chain,
      transport: http(values.rpcURL)
    })
  })

  const userOpHash = await entryPointContract.read.getUserOpHash([
    {
      sender: _add0x(userOp.sender),
      nonce: BigInt(userOp.nonce),
      initCode: await smartAccountClient.account.getInitCode(),
      callData: toHex(userOp.callData),
      callGasLimit: userOp.callGasLimit? BigInt(userOp.callGasLimit): ZERO,
      verificationGasLimit: userOp.verificationGasLimit? BigInt(userOp.verificationGasLimit): ZERO,
      preVerificationGas: userOp.preVerificationGas? BigInt(userOp.preVerificationGas): ZERO,
      maxFeePerGas: userOp.maxFeePerGas? BigInt(userOp.maxFeePerGas): ZERO,
      maxPriorityFeePerGas: userOp.maxPriorityFeePerGas? BigInt(userOp.maxPriorityFeePerGas): ZERO,
      paymasterAndData: '0x',
      signature: toHex(userOp.signature),
    }
  ]);

  return userOpHash;
}