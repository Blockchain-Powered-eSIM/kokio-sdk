import { AccountOp, createSmartAccountClient, EntryPointAbi_v6, getEntryPoint, SmartAccountClient, SmartContractAccount, toSmartContractAccount, WalletClientSigner,  } from "@aa-sdk/core";
import { http, type SignableMessage, type Hash, WalletClient, Hex, encodeFunctionData, Address, encodePacked, encodeAbiParameters, toHex, getContract, createPublicClient, fromHex } from "viem";
import { _getChainSpecificConstants, ZERO } from "../constants";
import { _add0x, _concatUint8Arrays, _remove0x, _shouldRemoveLeadingZero } from "../utils";
import { P256Credential, PublicKey, SignedRequest, WebAuthnSignature } from "../../types";
import { DeviceWallet, DeviceWalletFactory } from "../../abis";
import { AsnParser } from "@peculiar/asn1-schema";
import { ECDSASigValue } from "@peculiar/asn1-ecc";
import { entryPoint06Address } from "viem/_types/constants/address";

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

// Parse the signature from the authenticator and remove the leading zero if necessary
const parseSignature = (signature: Uint8Array): {r: Hex, s: Hex} => {

  const parsedSignature = AsnParser.parse(signature, ECDSASigValue);
  let rBytes = new Uint8Array(parsedSignature.r);
  let sBytes = new Uint8Array(parsedSignature.s);
  if (_shouldRemoveLeadingZero(rBytes)) {
    rBytes = rBytes.slice(1);
  }
  if (_shouldRemoveLeadingZero(sBytes)) {
    sBytes = sBytes.slice(1);
  }
  const finalSignature = _concatUint8Arrays([rBytes, sBytes]);
  return {
    r: toHex(finalSignature.slice(0, 32)),
    s: toHex(finalSignature.slice(32)),
  };
}

const _getP256Credentials = async (signedRequest: SignedRequest): Promise<P256Credential> => {

  const stampHeaderValue = JSON.parse(signedRequest.stamp.stampHeaderValue);
  const {authenticatorData, clientDataJson, credentialId, signature} = stampHeaderValue;

  const clientDataBinary = Uint8Array.from(Buffer.from(clientDataJson, 'base64url'));
  const decoded = new TextDecoder().decode(clientDataBinary);
  const clientDataObj = JSON.parse(decoded);

  let authenticatorDataHex = toHex(Buffer.from(authenticatorData, 'base64url'));
  let signatureDecoded = parseSignature(Uint8Array.from(Buffer.from(signature, 'base64url')));

  return {
    rawId: toHex(Buffer.from(credentialId, 'base64url')),
    clientData: {
      type: clientDataObj.type,
      challenge: clientDataObj.challenge,
      origin: clientDataObj.origin,
      crossOrigin: clientDataObj.crossOrigin,
    },
    authenticatorData: authenticatorDataHex,
    signature: signatureDecoded,
  };
}

export const _signMessage = async (message: SignableMessage, signedRequest: SignedRequest): Promise<Hex> => {

    const credentials = await _getP256Credentials(signedRequest); 
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
                  type: "bytes32",
                },
                {
                  name: "s",
                  type: "bytes32",
                },
              ],
            },
          ],
          [
            {
              authenticatorData: credentials.authenticatorData,
              clientDataJSON: JSON.stringify(credentials.clientData),
              challengeIndex: BigInt(23),
              typeIndex: BigInt(1),
              r: credentials.signature.r,
              s: credentials.signature.s,
            },
          ],
        ),
      ],
    );

    return signature;
}

const _signUserOperationHash = async (hash: Hex, signedRequest: SignedRequest): Promise<Hex> => {

  const message = encodePacked(["uint8", "uint48", "bytes32"], [1, 0, hash]);
  return _signMessage(message, signedRequest);
}

export const _getSmartWallet = async (client: WalletClient, deviceUniqueIdentifier: string, deviceWalletOwnerKey: PublicKey, salt: bigint, depositAmount: bigint, signedRequest: SignedRequest): Promise<SmartContractAccount> => {

  const chainID = await client.getChainId();
  const values = _getChainSpecificConstants(chainID);

  const signer = new WalletClientSigner(client, "wallet")

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
        
        signMessage: async ({ message }): Promise<Hash> => _signMessage(message, signedRequest),

        signTypedData: async (typedData): Promise<Hash> => signer.signTypedData(typedData),
        
        /// OPTIONAL PARAMS ///
        // if you already know your account's address, pass that in here to avoid generating a new counterfactual
        // TO-DO: Once contract functions are exposed use getAddress() on DeviceWalletFactory to compute addess
        // accountAddress: "0x...",
        // if your account supports batching, this should take an array of UOs and return the calldata for calling your contract's batchExecute method
        encodeBatchExecute: async (uos): Promise<Hash> => _encodeBatchExecute(uos),
        // if your contract expects a different signing scheme than the default signMessage scheme, you can override that here
        signUserOperationHash: async (hash): Promise<Hash> => _signUserOperationHash(hash, signedRequest),
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