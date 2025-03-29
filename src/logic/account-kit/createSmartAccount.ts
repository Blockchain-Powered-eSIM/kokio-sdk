import { AccountOp, getEntryPoint, SmartContractAccount, toSmartContractAccount, WalletClientSigner } from "@aa-sdk/core";
import { AlchemyWebSigner } from "@account-kit/signer";
import { http, type SignableMessage, type Hash, WalletClient, PublicClient, Hex, encodeFunctionData, ContractFunctionReturnType, Address } from "viem";
import { optimismSepolia, sepolia } from "viem/chains";
import { _getChainSpecificConstants, ZERO } from "../constants";
import { _add0x, _remove0x } from "../utils";
import { PublicKey } from "../../types";
import { DeviceWallet, DeviceWalletFactory } from "../../abis";
import { createAlchemySmartAccountClient } from "@account-kit/core";
import { alchemy } from '@account-kit/infra';

// Only for testing current contract, for DeviceWallet we can directly use 'encodeExecute'
const _encodeExecute = async (tx: AccountOp) => {

  return encodeFunctionData({
    abi: DeviceWallet,
    functionName: "execute",
    args: [{
      dest: tx.target,
      value: tx.value ?? ZERO,
      data: tx.data
    }]
  })
}

const _encodeBatchExecute = async (txs: AccountOp[]) => {
  
  const new_txs:{dest:Address, value:bigint, data: Hex | '0x'}[] = [];
  for (let i=0; i<txs.length; ++i) {
    new_txs.push({
      dest: txs[i].target,
      value: txs[i].value ?? ZERO,
      data: txs[i].data
    })
  }
  return encodeFunctionData({
    abi: DeviceWallet,
    functionName: "executeBatch",
    args: [new_txs]
  })
}

const _getAccountInitCode = async (client: WalletClient, deviceUniqueIdentifier: string, deviceWalletOwnerKey: PublicKey, salt: bigint, depositAmount: bigint): Promise<Hex> => {

  const chainID = await client.getChainId();
  const values = _getChainSpecificConstants(chainID);

  const callData =  encodeFunctionData({
    abi: DeviceWalletFactory, // change to DeviceWalletFactory abi once deployed
    functionName: "createAccount",
    args: [deviceUniqueIdentifier, deviceWalletOwnerKey, salt, depositAmount],
  })

  return _add0x(values.factoryAddresses.DEVICE_WALLET_FACTORY + _remove0x(callData)); // Use once deployed
  // return _add0x('0x98Bb4ceD7623CCc15223C2Fbc86D0B87a1Ff3Ad5' + _remove0x(callData)); // For testing
}

export const _getSmartWallet = async (client: WalletClient, deviceUniqueIdentifier: string, deviceWalletOwnerKey: PublicKey, salt: bigint, depositAmount: bigint): Promise<SmartContractAccount> => {

  const chainID = await client.getChainId();
  const values = _getChainSpecificConstants(chainID);

  const signer = new WalletClientSigner(client, "wallet")

    return toSmartContractAccount({
        /// REQUIRED PARAMS ///
        source: "MyAccount",
        transport: http(values.rpcURL),
        
        chain: optimismSepolia,

        // The EntryPointDef that your account is compatible with
        entryPoint: getEntryPoint(optimismSepolia, {addressOverride: values.factoryAddresses.ENTRY_POINT}), // NOTE: To be used once contracts deployed
        // entryPoint: getEntryPoint(optimismSepolia, {addressOverride: '0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789'}), // For testing only

        // This should return a concatenation of your `factoryAddress` and the `callData` for your factory's create account method
        getAccountInitCode: async (): Promise<Hash> => await _getAccountInitCode(client, deviceUniqueIdentifier, deviceWalletOwnerKey, salt, depositAmount),
        
        // an invalid signature that doesn't cause your account to revert during validation
        getDummySignature: async (): Promise<Hash> => "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c", //from Alchemy docs
        
        // given a UO in the form of {target, data, value} should output the calldata for calling your contract's execution method
        // encodeExecute: async (uo): Promise<Hash> => "0x....",
        encodeExecute: async (uo): Promise<Hash> => _encodeExecute(uo),
        
        signMessage: async ({ message }): Promise<Hash> => signer.signMessage(message),

        signTypedData: async (typedData): Promise<Hash> => signer.signTypedData(typedData),
        
        /// OPTIONAL PARAMS ///
        // if you already know your account's address, pass that in here to avoid generating a new counterfactual
        // TO-DO: Once contract functions are exposed use getAddress() on DeviceWalletFactory to compute addess
        // accountAddress: "0x...",
        // if your account supports batching, this should take an array of UOs and return the calldata for calling your contract's batchExecute method
        encodeBatchExecute: async (uos): Promise<Hash> => _encodeBatchExecute(uos),
        // if your contract expects a different signing scheme than the default signMessage scheme, you can override that here
        // signUserOperationHash: async (hash): Promise<Hash> => "0x...",
        // allows you to define the calldata for upgrading your account
        // encodeUpgradeToAndCall: async (params): Promise<Hash> => "0x...",
    })
}

export const _getSmartWalletClient = async (account: SmartContractAccount) => {
  return createAlchemySmartAccountClient({
    // created above
    account: account,
    chain: optimismSepolia,
    transport: alchemy({
      apiKey: "VxSGeL7F1vaQ0_T3IrVTYCuOv086a9Gi", //Replace later
    }),
  });
}