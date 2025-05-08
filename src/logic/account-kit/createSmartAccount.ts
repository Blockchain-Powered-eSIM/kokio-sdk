import { 
	AccountOp,
	createSmartAccountClient,
	getEntryPoint,
	SmartContractAccount,
	toSmartContractAccount,
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
	hashMessage
} from "viem";
import { TurnkeyClient } from "@turnkey/http";
import { BytesLike, ethers, hexlify } from "ethers";
import { _getChainSpecificConstants, ZERO, SIGNATURE_VALIDITY_SECONDS } from "../constants.js";
import { _add0x, _concatUint8Arrays, _remove0x, _shouldRemoveLeadingZero } from "../utils.js";
import { P256Key, WebAuthnSignature } from "../../types.js";
import { DeviceWallet, DeviceWalletFactory } from "../../abis/index.js";
import { _signMessageWithTurnkey, _signTypedDataWithTurnkey, _stampAndSignMessageWithTurnkey, _stampAndSignTypedDataWithTurnkey } from "../services/turnkeyClient.js";
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
		args: [deviceUniqueIdentifier, deviceWalletOwnerKey, salt, ZERO],
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
	]);

	const beaconProxyBytecode = "0x60a06040526040516105bf3803806105bf83398101604081905261002291610387565b61002c828261003e565b506001600160a01b031660805261047e565b610047826100fe565b6040516001600160a01b038316907f1cf3b03a6cf19fa2baba4df148e9dcabedea7f8a5c07840e207e5c089be95d3e90600090a28051156100f2576100ed826001600160a01b0316635c60da1b6040518163ffffffff1660e01b8152600401602060405180830381865afa1580156100c3573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906100e79190610447565b82610211565b505050565b6100fa610288565b5050565b806001600160a01b03163b60000361013957604051631933b43b60e21b81526001600160a01b03821660048201526024015b60405180910390fd5b807fa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d5080546001600160a01b0319166001600160a01b0392831617905560408051635c60da1b60e01b81529051600092841691635c60da1b9160048083019260209291908290030181865afa1580156101b5573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906101d99190610447565b9050806001600160a01b03163b6000036100fa57604051634c9c8ce360e01b81526001600160a01b0382166004820152602401610130565b6060600080846001600160a01b03168460405161022e9190610462565b600060405180830381855af49150503d8060008114610269576040519150601f19603f3d011682016040523d82523d6000602084013e61026e565b606091505b50909250905061027f8583836102a9565b95945050505050565b34156102a75760405163b398979f60e01b815260040160405180910390fd5b565b6060826102be576102b982610308565b610301565b81511580156102d557506001600160a01b0384163b155b156102fe57604051639996b31560e01b81526001600160a01b0385166004820152602401610130565b50805b9392505050565b8051156103185780518082602001fd5b604051630a12f52160e11b815260040160405180910390fd5b80516001600160a01b038116811461034857600080fd5b919050565b634e487b7160e01b600052604160045260246000fd5b60005b8381101561037e578181015183820152602001610366565b50506000910152565b6000806040838503121561039a57600080fd5b6103a383610331565b60208401519092506001600160401b03808211156103c057600080fd5b818501915085601f8301126103d457600080fd5b8151818111156103e6576103e661034d565b604051601f8201601f19908116603f0116810190838211818310171561040e5761040e61034d565b8160405282815288602084870101111561042757600080fd5b610438836020830160208801610363565b80955050505050509250929050565b60006020828403121561045957600080fd5b61030182610331565b60008251610474818460208701610363565b9190910192915050565b6080516101276104986000396000601e01526101276000f3fe6080604052600a600c565b005b60186014601a565b60a0565b565b60007f00000000000000000000000000000000000000000000000000000000000000006001600160a01b0316635c60da1b6040518163ffffffff1660e01b8152600401602060405180830381865afa1580156079573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190609b919060c3565b905090565b3660008037600080366000845af43d6000803e80801560be573d6000f35b3d6000fd5b60006020828403121560d457600080fd5b81516001600160a01b038116811460ea57600080fd5b939250505056fea2646970667358221220d2ef783a147afe4beaf6cec0d85c3b6cd6a11a48e1a7f60eac2d7a83dac8508e64736f6c63430008190033";

	// Encode BeaconProxy constructor args
	const beaconProxyConstructorArgs = abiCoder.encode(
		["address", "bytes"],
		[beacon, deviceWalletInitData]
	);
	
	// Compute initCode
	const initCode:BytesLike = ethers.concat([beaconProxyBytecode, beaconProxyConstructorArgs]);

	return ethers.keccak256(initCode);
}

const prepareSaltForCreate2 = (sender: Address, salt: BigInt): BytesLike => {

	// Calculating unique salt based on createAccount function's implementation
	const abiCoder = ethers.AbiCoder.defaultAbiCoder();
	const encoded = abiCoder.encode(
		["address", "uint256"],
		[sender, salt]
	);
	const uniqueSaltBytes32 = ethers.keccak256(encoded);

	return uniqueSaltBytes32;
}

// NOTE: Sender is the address that deploys the contract.
// In case of ERC-4337, it is the Entry Point contract address
const getCounterFactualAddress = async (client: WalletClient, deviceUniqueIdentifier: string, deviceWalletOwnerKey: P256Key, salt: BigInt, sender?: Address):Promise<Hex> => {

	const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);
	const deviceWalletFactoryAddress = values.factoryAddresses.DEVICE_WALLET_FACTORY;
	
	sender = sender? sender : values.factoryAddresses.SENDER_CREATOR;
	const uniqueSaltBytes32 = prepareSaltForCreate2(sender, salt);
	const initCodeHash = await getInitCodeHash(client, deviceUniqueIdentifier, deviceWalletOwnerKey);

	// Calculate deterministic address from init code hash
	const create2Address = ethers.getCreate2Address(deviceWalletFactoryAddress, uniqueSaltBytes32, initCodeHash);

	return ethers.getAddress(create2Address) as Address;
}

const _encodeSignature = async (webAuthnSignature: WebAuthnSignature, validUntil: number): Promise<Hex> => {
	console.log("SDK _encodeSignature (webAuthnSignature):", webAuthnSignature);
	const authenticatorDataBytes = _add0x(webAuthnSignature.authenticatorData);
	const clientDataJSON = webAuthnSignature.clientDataJSON;
	const challengeIndexBigInt = BigInt(webAuthnSignature.challengeIndex);
	const typeIndexBigInt = BigInt(webAuthnSignature.typeIndex);
	const rBigInt = BigInt(webAuthnSignature.r);
	const sBigInt = BigInt(webAuthnSignature.s);
	console.log("SDK: _encodeSignature (before getting encoded):", {
		authenticatorData: authenticatorDataBytes,
		clientDataJSON: clientDataJSON,
		challengeIndex: challengeIndexBigInt,
		typeIndex: typeIndexBigInt,
		r: rBigInt,
		s: sBigInt
	});
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
	], [
		{
			authenticatorData: authenticatorDataBytes,
			clientDataJSON: clientDataJSON,
			challengeIndex: challengeIndexBigInt,
			typeIndex: typeIndexBigInt,
			r: rBigInt,
			s: sBigInt
		}
	]);
	console.log("SDK _encodeSignature (encodedWebAuthnSignatureBytes):", encodedWebAuthnSignatureBytes);
	const signature = encodePacked(["uint8", "uint48", "bytes"], [
		1, // version
		validUntil,
		encodedWebAuthnSignatureBytes
	]);
	console.log("SDK _encodeSignature (signature):", signature);
	return signature;
};

// message here is the original message data (string or Uint8Array) directly from the app
const _signMessage = async (message: SignableMessage, turnkeyClient: TurnkeyClient, organiationId: string, signWith: Address): Promise<Hex> => {

	const validUntil = Math.floor(Date.now() / 1000) + SIGNATURE_VALIDITY_SECONDS;
	console.log("SDK _signMessage (validUntil):", validUntil);

	const payload = hashMessage(message);
	console.log("SDK _signMessage (payload):", payload);
	// The original message is passed to the stamp and sign function.
	// The stamp and sign function creates the EIP-191 digest hash using its hashMessage function
	// The result of the hashMessage(message) will be the `payload` used by Turnkey as a challenge
	const webAuthnSignature = await _stampAndSignMessageWithTurnkey(turnkeyClient, organiationId, signWith, payload);
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

const _signUserOperationHash = async (hash: Hex, turnkeyClient: TurnkeyClient, organiationId: string, signWith: Address): Promise<Hex> => {

	console.log("SDK _signUserOperationHash (hash):", hash);
	const validUntil = Math.floor(Date.now() / 1000) + SIGNATURE_VALIDITY_SECONDS;
    console.log("SDK _signUserOperationHash (validUntil):", validUntil);

	const messagePrecursor = encodePacked(["uint8", "uint48", "bytes32"], [
        1,
        validUntil,
        hash
    ]);
    console.log("SDK _signUserOperationHash (messagePrecursor):", messagePrecursor);

	const payload = hashMessage({ raw: messagePrecursor });
    console.log("SDK _signUserOperationHash (payload):", payload);

	const webAuthnSignature = await _stampAndSignMessageWithTurnkey(turnkeyClient, organiationId, signWith, payload);
    console.log("SDK _signUserOperationHash (webAuthnSignature):", webAuthnSignature);

	return _encodeSignature(webAuthnSignature, validUntil);
}

export const _getSmartWallet = async (
	client: WalletClient,
	turnkeyClient: TurnkeyClient,
	organiationId: string,
	deviceUniqueIdentifier: string,
	deviceWalletOwnerKey: P256Key,
	salt: bigint,
	sender?: Address
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
		
		signMessage: async ({ message}): Promise<Hash> => _signMessage(message, turnkeyClient, organiationId, signWith),

		signTypedData: async (typedData): Promise<Hash> => _signTypedData(typedData, turnkeyClient, organiationId, signWith),
		
		/// OPTIONAL PARAMS ///
		// if you already know your account's address, pass that in here to avoid generating a new counterfactual
		accountAddress: await getCounterFactualAddress(client, deviceUniqueIdentifier, deviceWalletOwnerKey, salt, sender),
		// if your account supports batching, this should take an array of UOs and return the calldata for calling your contract's batchExecute method
		encodeBatchExecute: async (uos): Promise<Hash> => _encodeBatchExecute(uos),
		// if your contract expects a different signing scheme than the default signMessage scheme, you can override that here
		signUserOperationHash: async (hash): Promise<Hash> => _signUserOperationHash(hash, turnkeyClient, organiationId, signWith),
		// allows you to define the calldata for upgrading your account
		// encodeUpgradeToAndCall: async (params): Promise<Hash> => "0x...",
	});
}

export const _getSmartWalletClient = async (client: WalletClient, gasPolicyId: string, account: SmartContractAccount) => {

	const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

	return createSmartAccountClient({
		// created above
		account: account,
		chain: values.chain,
		transport: http(values.rpcURL),
		...alchemyGasManagerMiddleware(gasPolicyId)
	});
}
