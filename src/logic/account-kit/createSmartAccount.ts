import { 
	AccountOp,
	createSmartAccountClient,
	getEntryPoint,
	SmartContractAccount,
	toSmartContractAccount,
	split
} from "@aa-sdk/core";
import { 
	http,
	type SignableMessage,
	type Hash,
	WalletClient,
	Hex,
	encodeFunctionData,
	Address,
	encodePacked,
	encodeAbiParameters,
	getContract,
	TypedDataDefinition,
	TypedData,
	hashMessage,
	stringToBytes,
	toHex
} from "viem";
import { TurnkeyClient } from "@turnkey/http";
import { BytesLike, ethers, hexlify, toBeHex, toBigInt, zeroPadValue } from "ethers";
import { _getChainSpecificConstants, ZERO, SIGNATURE_VALIDITY_SECONDS } from "../constants.js";
import { _add0x, _concatUint8Arrays, _remove0x, _shouldRemoveLeadingZero } from "../utils.js";
import { P256Key, WebAuthnSignature } from "../../types.js";
import { DeviceWallet, DeviceWalletFactory } from "../../abis/index.js";
import { _signMessageWithTurnkey, _signTypedDataWithTurnkey, _stamp, _stampAndSignMessageWithTurnkey, _stampAndSignTypedDataWithTurnkey } from "../services/turnkeyClient.js";
import { alchemyGasManagerMiddleware } from "@account-kit/infra";

const _encodeExecute = async (tx: AccountOp) => {

	return encodeFunctionData({
		abi: DeviceWallet,
		functionName: "execute",
		args: [{
			dest: tx.target,
			value: tx.value ?? ZERO,
			data: tx.data
		}]
	});
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
	});
}

const _getAccountInitCode = async (client: WalletClient, deviceUniqueIdentifier: string, deviceWalletOwnerKey: P256Key, salt: bigint): Promise<Hex> => {

	// To send with user operations
	const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

	const callData =  encodeFunctionData({
		abi: DeviceWalletFactory, 
		functionName: "createAccount",
		args: [deviceUniqueIdentifier, deviceWalletOwnerKey, salt],
	})

	return values.factoryAddresses.DEVICE_WALLET_FACTORY.concat(_remove0x(callData)) as Hex;
}

const getInitCodeHash = async (client: WalletClient, deviceUniqueIdentifier: string, deviceWalletOwnerKey: P256Key): Promise<BytesLike> => {
  
	const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);
  
	// off-chain computation of the DeviceWallet address
	const registry = values.factoryAddresses.REGISTRY;
	const deviceWalletFactoryAddress = values.factoryAddresses.DEVICE_WALLET_FACTORY;
	const eSIMWalletFactoryAddress = values.factoryAddresses.ESIM_WALLET_FACTORY;

	const deviceWalletFactory = getContract({
		abi: DeviceWalletFactory,
		address: deviceWalletFactoryAddress,
		client
	});

	const beacon = await deviceWalletFactory.read.beacon([]);

	const abiCoder = ethers.AbiCoder.defaultAbiCoder();

	// Encode the DeviceWallet.init with the init params
	const deviceWallet = new ethers.Interface(DeviceWallet);
	const deviceWalletInitData = deviceWallet.encodeFunctionData("init", [
		registry,
		deviceWalletOwnerKey,
		deviceUniqueIdentifier,
		eSIMWalletFactoryAddress
	]);

	const beaconProxyBytecode = "0x60a06040908082526104a8803803809161001982856102ae565b8339810182828203126101e95761002f826102e7565b60208084015191939091906001600160401b0382116101e9570182601f820112156101e957805190610060826102fb565b9361006d875195866102ae565b8285528383830101116101e957829060005b83811061029a57505060009184010152823b1561027a577fa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d5080546001600160a01b0319166001600160a01b038581169182179092558551635c60da1b60e01b8082529194928482600481895afa91821561026f57600092610238575b50813b1561021f5750508551847f1cf3b03a6cf19fa2baba4df148e9dcabedea7f8a5c07840e207e5c089be95d3e600080a282511561020057508290600487518096819382525afa9283156101f5576000936101b3575b5091600080848461019096519101845af4903d156101aa573d610174816102fb565b90610181885192836102ae565b8152600081943d92013e610316565b505b6080525161012e908161037a82396080518160180152f35b60609250610316565b92508183813d83116101ee575b6101ca81836102ae565b810103126101e9576000806101e1610190956102e7565b945050610152565b600080fd5b503d6101c0565b85513d6000823e3d90fd5b9350505050346102105750610192565b63b398979f60e01b8152600490fd5b8751634c9c8ce360e01b81529116600482015260249150fd5b9091508481813d8311610268575b61025081836102ae565b810103126101e957610261906102e7565b90386100fb565b503d610246565b88513d6000823e3d90fd5b8351631933b43b60e21b81526001600160a01b0384166004820152602490fd5b81810183015186820184015284920161007f565b601f909101601f19168101906001600160401b038211908210176102d157604052565b634e487b7160e01b600052604160045260246000fd5b51906001600160a01b03821682036101e957565b6001600160401b0381116102d157601f01601f191660200190565b9061033d575080511561032b57805190602001fd5b604051630a12f52160e11b8152600490fd5b81511580610370575b61034e575090565b604051639996b31560e01b81526001600160a01b039091166004820152602490fd5b50803b1561034656fe60806040819052635c60da1b60e01b81526020816004817f00000000000000000000000000000000000000000000000000000000000000006001600160a01b03165afa90811560a9576000916054575b5060da565b905060203d60201160a3575b601f8101601f191682019167ffffffffffffffff831181841017608d576088926040520160b5565b38604f565b634e487b7160e01b600052604160045260246000fd5b503d6060565b6040513d6000823e3d90fd5b602090607f19011260d5576080516001600160a01b038116810360d55790565b600080fd5b6000808092368280378136915af43d82803e1560f4573d90f35b3d90fdfea264697066735822122099ba460fd62b3e22c737d15959887e6cae3498f3495d31e43e2bcf1283aec7d264736f6c63430008190033";

	// Encode BeaconProxy constructor args
	const beaconProxyConstructorArgs = abiCoder.encode(
		["address", "bytes"],
		[beacon, deviceWalletInitData]
	);
	
	// Compute initCode
	const initCode:BytesLike = ethers.concat([beaconProxyBytecode, beaconProxyConstructorArgs]);

	return ethers.keccak256(initCode);
}

const getCounterFactualAddress = async (client: WalletClient, deviceUniqueIdentifier: string, deviceWalletOwnerKey: P256Key, salt: bigint):Promise<Hex> => {

	const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);
	const deviceWalletFactoryAddress = values.factoryAddresses.DEVICE_WALLET_FACTORY;

	const uniqueSaltBytes32 = toHex(salt, {size: 32});
	const initCodeHash = await getInitCodeHash(client, deviceUniqueIdentifier, deviceWalletOwnerKey);
	console.log("initCodeHash: ", initCodeHash);

	// Calculate deterministic address from init code hash
	const create2Address = ethers.getCreate2Address(deviceWalletFactoryAddress, uniqueSaltBytes32, initCodeHash);
	console.log("create2Address: ", create2Address);

	return ethers.getAddress(create2Address) as Address;
}

const _encodeSignature = async (webAuthnSignature: WebAuthnSignature, validUntil: number): Promise<Hex> => {
	console.log("SDK _encodeSignature (webAuthnSignature):", webAuthnSignature);

	const encodedWebAuthnSignatureBytes = encodeAbiParameters([
		{
			type: "tuple",
			name: "WebAuthnSignature",
			components: [
				{ name: "authenticatorData", type: "bytes", },
				{ name: "clientDataJSON", type: "string", },
				{ name: "challengeIndex", type: "uint256", },
				{ name: "typeIndex", type: "uint256", },
				{ name: "r", type: "uint256", },
				{ name: "s", type: "uint256", },
			],
		},
	], 
	[
		webAuthnSignature
	]);
	console.log("SDK _encodeSignature (encodedWebAuthnSignatureBytes):", encodedWebAuthnSignatureBytes);
	const signature = encodePacked(
		["uint8", "uint48", "bytes"],
		[1, validUntil, encodedWebAuthnSignatureBytes]
	);
	console.log("SDK _encodeSignature (signature):", signature);
	return signature;
};

// message here is the original message data (string or Uint8Array) directly from the app
const _signMessage = async (message: SignableMessage, credentialId: string, rpId: string): Promise<Hex> => {

	const validUntil = Math.floor(Date.now() / 1000) + SIGNATURE_VALIDITY_SECONDS;
	console.log("SDK _signMessage (validUntil):", validUntil);

	const payload = hashMessage({raw: stringToBytes(message as string)});
	console.log("SDK _signMessage (payload):", payload);
	// The original message is passed to the stamp and sign function.
	// The stamp and sign function creates the EIP-191 digest hash using its hashMessage function
	// The result of the hashMessage(message) will be the `payload` used by Turnkey as a challenge
	const webAuthnSignature = await _stamp(credentialId, rpId, payload);
	// const webAuthnSignature = await _stampAndSignMessageWithTurnkey(turnkeyClient, organiationId, signWith, payload);
	console.log("SDK _signMessage (webAuthnSignature):", webAuthnSignature);
	return _encodeSignature(webAuthnSignature, validUntil);
}

const _signTypedData = async <
    const typedData extends TypedData | Record<string, unknown>,
    primaryType extends keyof typedData | "EIP712Domain" = keyof typedData
> (typedData: TypedDataDefinition<typedData, primaryType>, turnkeyClient: TurnkeyClient, organiationId: string, signWith: Address): Promise<Hex> => {

	// signature valid until, UNIX timestamp in seconds
	const validUntil = Math.floor(Date.now() / 1000) + SIGNATURE_VALIDITY_SECONDS;

	const webAuthnSignature = await _stampAndSignTypedDataWithTurnkey(turnkeyClient, organiationId, signWith, typedData);

	return _encodeSignature(webAuthnSignature, validUntil);
}

const _signUserOperationHash = async (credentialId: string, rpId: string, userOpHash: Hex): Promise<Hex> => {

	console.log("SDK _signUserOperationHash (userOpHash):", userOpHash);
	const validUntil = Math.floor(Date.now() / 1000) + SIGNATURE_VALIDITY_SECONDS;
    console.log("SDK _signUserOperationHash (validUntil):", validUntil);

	const messagePrecursor = encodePacked(["uint8", "uint48", "bytes32"], [
        1,
        validUntil,
        userOpHash
    ]);
    console.log("SDK _signUserOperationHash (messagePrecursor):", messagePrecursor);

	const payload = hashMessage({ raw: messagePrecursor });
    console.log("SDK _signUserOperationHash (payload):", payload);

	// const webAuthnSignature = await _stampAndSignMessageWithTurnkey(turnkeyClient, organiationId, signWith, payload);
	const webAuthnSignature = await _stamp(credentialId, rpId, payload);
    console.log("SDK _signUserOperationHash (webAuthnSignature):", webAuthnSignature);

	return _encodeSignature(webAuthnSignature, validUntil);
}

export const _getSmartWallet = async (
	client: WalletClient,
	turnkeyClient: TurnkeyClient,
	credentialId: string,
	rpId: string,
	organiationId: string,
	deviceUniqueIdentifier: string,
	deviceWalletOwnerKey: P256Key,
	salt: bigint
): Promise<SmartContractAccount> => {

	const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

	if (!client.account) throw new Error ('Error: No signer account found with WalletClient')
	const signWith = client.account.address;

	return toSmartContractAccount({
		/// REQUIRED PARAMS ///
		source: "MyAccount",
		transport: http(values.rpcURL),
		
		chain: values.chain,

		// The EntryPointDef that your account is compatible with
        entryPoint: getEntryPoint(values.chain, {version: "0.7.0"}), 

		getAccountInitCode: async (): Promise<Hex> => await _getAccountInitCode(client, deviceUniqueIdentifier, deviceWalletOwnerKey, salt),

		// getAccountInitCodeHash: async (): Promise<BytesLike> => await getInitCodeHash(client, deviceUniqueIdentifier, deviceWalletOwnerKey),
		
		// an invalid signature that doesn't cause your account to revert during validation
		getDummySignature: async (): Promise<Hash> => "0x",
		
		// given a UO in the form of {target, data, value} should output the calldata for calling your contract's execution method
		encodeExecute: async (uo): Promise<Hash> => _encodeExecute(uo),
		
		signMessage: async ({ message}): Promise<Hash> => _signMessage(message, credentialId, rpId),

		signTypedData: async (typedData): Promise<Hash> => _signTypedData(typedData, turnkeyClient, organiationId, signWith),
		
		/// OPTIONAL PARAMS ///
		// if you already know your account's address, pass that in here to avoid generating a new counterfactual
		accountAddress: await getCounterFactualAddress(client, deviceUniqueIdentifier, deviceWalletOwnerKey, salt),
		// if your account supports batching, this should take an array of UOs and return the calldata for calling your contract's batchExecute method
		encodeBatchExecute: async (uos): Promise<Hash> => _encodeBatchExecute(uos),
		// if your contract expects a different signing scheme than the default signMessage scheme, you can override that here
		signUserOperationHash: async (hash): Promise<Hash> => _signUserOperationHash(credentialId, rpId, hash),
		// allows you to define the calldata for upgrading your account
		// encodeUpgradeToAndCall: async (params): Promise<Hash> => "0x...",
	});
}

export const _getSmartWalletClient = async (client: WalletClient, gasPolicyId: string, account: SmartContractAccount) => {

	const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);
	// TODO: Defined PIMLICO_RPC_URL
	const PIMLICO_RPC_URL = "";

	const bundlerMethods = [
			"eth_sendUserOperation",
			"eth_estimateUserOperationGas",
			"eth_getUserOperationReceipt",
			"eth_getUserOperationByHash",
			"eth_supportedEntryPoints",
	];

	return createSmartAccountClient({
		// created above
		account: account,
		chain: values.chain,
		transport: split({
			overrides: [
				{
					methods: bundlerMethods,
					transport: http(`${PIMLICO_RPC_URL}`),
				},
			],
			fallback: http(values.rpcURL),
		}),
		// transport: http(values.rpcURL),
		...alchemyGasManagerMiddleware(gasPolicyId)
	});
}
