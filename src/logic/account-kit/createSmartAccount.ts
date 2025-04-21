import { AccountOp, createSmartAccountClient, EntryPointAbi_v6, GetAccountParameter, getEntryPoint, SmartAccountClient, SmartContractAccount, toSmartContractAccount, WalletClientSigner} from "@aa-sdk/core";
import { http, type SignableMessage, type Hash, WalletClient, Hex, encodeFunctionData, Address, encodePacked, encodeAbiParameters, toHex, getContract, createPublicClient, fromHex, TypedDataDefinition, TypedData } from "viem";
import { _getChainSpecificConstants, ZERO } from "../constants.js";
import { _add0x, _concatUint8Arrays, _remove0x, _shouldRemoveLeadingZero } from "../utils.js";
import { P256Credential, PublicKey, SignedRequest, WebAuthnSignature } from "../../types.js";
import { DeviceWallet, DeviceWalletFactory } from "../../abis/index.js";
import { TurnkeyClient } from "@turnkey/http";
import { _signMessageWithTurnkey, _signTypedDataWithTurnkey } from "../services/turnkeyClient.js";

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
    abi: DeviceWalletFactory, 
    functionName: "createAccount",
    args: [deviceUniqueIdentifier, deviceWalletOwnerKey, salt, depositAmount],
  })

  return _add0x(values.factoryAddresses.DEVICE_WALLET_FACTORY + _remove0x(callData)); // Use once deployed
}

const _encodeSignature = async (webAuthnSignature: WebAuthnSignature): Promise<Hex> => {

  const signature = encodePacked(
    ["uint8", "uint48", "bytes"],
    [
      1,
      0,
      encodeAbiParameters(
        [
          {
            type: "tuple",
            name: "credentials",
            components: [
              {
                name: "authenticatorData",
                type: "bytes",
              },
              {
                name: "clientDataJSON",
                type: "string",
              },
              {
                name: "challengeIndex",
                type: "uint256",
              },
              {
                name: "typeIndex",
                type: "uint256",
              },
              {
                name: "r",
                type: "uint256",
              },
              {
                name: "s",
                type: "uint256",
              },
            ],
          },
        ],
        [
          {
            authenticatorData: _add0x(webAuthnSignature.authenticatorData),
            clientDataJSON: JSON.stringify(webAuthnSignature.clientDataJSON),
            challengeIndex: BigInt(23),
            typeIndex: BigInt(1),
            r: webAuthnSignature.r,
            s: webAuthnSignature.s,
          },
        ],
      ),
    ],
  );

  return signature;
}

const _signMessage = async (message: SignableMessage, turnkeyClient: TurnkeyClient, organiationId: string, signWith: Address): Promise<Hex> => {

  const webAuthnSignature = await _signMessageWithTurnkey(turnkeyClient, organiationId, signWith, message);

  return _encodeSignature(webAuthnSignature);
}

const _signTypedData = async <
    const typedData extends TypedData | Record<string, unknown>,
    primaryType extends keyof typedData | "EIP712Domain" = keyof typedData
> (typedData: TypedDataDefinition<typedData, primaryType>, turnkeyClient: TurnkeyClient, organiationId: string, signWith: Address): Promise<Hex> => {

  const webAuthnSignature = await _signTypedDataWithTurnkey(turnkeyClient, organiationId, signWith, typedData);

  return _encodeSignature(webAuthnSignature);
}

const _signUserOperationHash = async (hash: Hex, turnkeyClient: TurnkeyClient, organiationId: string, signWith: Address): Promise<Hex> => {

  const message = encodePacked(["uint8", "uint48", "bytes32"], [1, 0, hash]);
  return _signMessage(message, turnkeyClient, organiationId, signWith);
}

export const _getSmartWallet = async (client: WalletClient, turnkeyClient: TurnkeyClient, organiationId: string, deviceUniqueIdentifier: string, deviceWalletOwnerKey: PublicKey, salt: bigint, depositAmount: bigint): Promise<SmartContractAccount> => {

  const chainID = await client.getChainId();
  const values = _getChainSpecificConstants(chainID);

  if (!client.account) throw new Error ('Error: No signer account found with WalletClient')
  const signWith = client.account.address

    return toSmartContractAccount({
        /// REQUIRED PARAMS ///
        source: "MyAccount",
        transport: http(values.rpcURL),
        
        chain: values.chain,

        // The EntryPointDef that your account is compatible with
        entryPoint: getEntryPoint(values.chain, {addressOverride: values.factoryAddresses.ENTRY_POINT}), 

        // This should return a concatenation of your `factoryAddress` and the `callData` for your factory's create account method
        getAccountInitCode: async (): Promise<Hash> => await _getAccountInitCode(client, deviceUniqueIdentifier, deviceWalletOwnerKey, salt, depositAmount),
        
        // an invalid signature that doesn't cause your account to revert during validation
        getDummySignature: async (): Promise<Hash> => "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c", //from Alchemy docs
        
        // given a UO in the form of {target, data, value} should output the calldata for calling your contract's execution method
        encodeExecute: async (uo): Promise<Hash> => _encodeExecute(uo),
        
        signMessage: async ({ message }): Promise<Hash> => _signMessage(message, turnkeyClient, organiationId, signWith),

        signTypedData: async (typedData): Promise<Hash> => _signTypedData(typedData, turnkeyClient, organiationId, signWith),
        
        /// OPTIONAL PARAMS ///
        // if you already know your account's address, pass that in here to avoid generating a new counterfactual
        // TO-DO: Once contract functions are exposed use getAddress() on DeviceWalletFactory to compute addess
        // accountAddress: "0x...",
        // if your account supports batching, this should take an array of UOs and return the calldata for calling your contract's batchExecute method
        encodeBatchExecute: async (uos): Promise<Hash> => _encodeBatchExecute(uos),
        // if your contract expects a different signing scheme than the default signMessage scheme, you can override that here
        signUserOperationHash: async (hash): Promise<Hash> => _signUserOperationHash(hash, turnkeyClient, organiationId, signWith),
        // allows you to define the calldata for upgrading your account
        // encodeUpgradeToAndCall: async (params): Promise<Hash> => "0x...",
    })
}

export const _getSmartWalletClient = async (client: WalletClient, account: SmartContractAccount) => {

  const chainID = await client.getChainId();
  const values = _getChainSpecificConstants(chainID);

  return createSmartAccountClient({
    // created above
    account: account,
    chain: values.chain,
    transport: http(values.rpcURL),
  });
}