import {
	http, createPublicClient, createTransport, publicActions, type Transport, type EIP1193RequestFn,
	type SignableMessage, type Hash, WalletClient, Hex, encodeFunctionData,
	Address, encodePacked, encodeAbiParameters, parseAbiParameters, getContract,
	concat, keccak256, getContractAddress, getAddress,
	TypedDataDefinition, TypedData, hashMessage, toHex, hashTypedData, hexToBytes, bytesToHex
} from "viem";
import {
	createBundlerClient, createPaymasterClient, entryPoint08Abi,
	getUserOperationHash, toSmartAccount, type UserOperation
} from "viem/account-abstraction";
import { _getChainSpecificConstants, ZERO, SIGNATURE_VALIDITY_SECONDS } from "../constants.js";
import { CounterfactualMismatchError } from "../errors.js";
import { _add0x, _concatUint8Arrays, _shouldRemoveLeadingZero } from "../utils.js";
import { P256Key, WebAuthnSignature, KokioSmartAccount, KokioSmartAccountClient } from "../../types.js";
import { DeviceWallet, DeviceWalletFactory } from "../../abis/index.js";

import { decodeAttestationObject, decodeClientDataJSON, isoBase64URL, parseAuthenticatorData } from "@simplewebauthn/server/helpers";
import { Passkey, PasskeyGetRequest, PasskeyGetResult } from "react-native-passkey";
import { p256 } from "@noble/curves/nist.js";

type BrokenPasskeyGetResult = PasskeyGetResult | string;

enum AuthenticatorTransport {
	usb = "usb",
	nfc = "nfc",
	ble = "ble",
	smartCard = "smart-card",
	hybrid = "hybrid",
	internal = "internal"
}

/**
 * BeaconProxy creation bytecode, used to compute the CREATE2 counterfactual
 * DeviceWallet address off-chain (initCode = creationCode ++ abi.encode(beacon, initData)).
 *
 * PINNED - this MUST byte-for-byte match the BeaconProxy the on-chain
 * DeviceWalletFactory deploys, or the computed address will diverge from the
 * deployed one. Source of truth:
 *   OpenZeppelin Contracts v5.0.0 - proxy/beacon/BeaconProxy.sol
 *   smart-contract-suite `deployments/base-sepolia-84532-entrypoint-v8.json`,
 *   section `create2`, solc 0.8.36, optimizer runs 10000000, viaIR: true,
 *   evm target osaka. Hash: 0xc571dd76379a732e12f1973fa9f4cbbaeb1702bb0ace06e5beb7e2b56cd03c6b.
 * NOTE: a different optimizer/compiler setting produces a DIFFERENT bytecode -
 * do not swap it in without re-verifying the counterfactual.
 * `_assertCounterfactualMatchesOnChain` guards against drift; `_getSmartWallet`
 * runs it once per chain per process.
 */
export const BEACON_PROXY_CREATION_CODE: Hex = "0x60a0806040526104e480380380916100178285610292565b833981016040828203126101eb5761002e826102c9565b602083015190926001600160401b0382116101eb57019080601f830112156101eb57815161005b816102dd565b926100696040519485610292565b8184526020840192602083830101116101eb57815f926020809301855e84010152823b15610274577fa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d5080546001600160a01b0319166001600160a01b038516908117909155604051635c60da1b60e01b8152909190602081600481865afa9081156101f7575f9161023a575b50803b1561021a5750817f1cf3b03a6cf19fa2baba4df148e9dcabedea7f8a5c07840e207e5c089be95d3e5f80a282511561020257602060049260405193848092635c60da1b60e01b82525afa9182156101f7575f926101ae575b505f809161018a945190845af43d156101a6573d9161016e836102dd565b9261017c6040519485610292565b83523d5f602085013e6102f8565b505b60805260405161018d908161035782396080518160460152f35b6060916102f8565b9291506020833d6020116101ef575b816101ca60209383610292565b810103126101eb575f80916101e161018a956102c9565b9394509150610150565b5f80fd5b3d91506101bd565b6040513d5f823e3d90fd5b505050341561018c5763b398979f60e01b5f5260045ffd5b634c9c8ce360e01b5f9081526001600160a01b0391909116600452602490fd5b90506020813d60201161026c575b8161025560209383610292565b810103126101eb57610266906102c9565b5f6100f5565b3d9150610248565b631933b43b60e21b5f9081526001600160a01b038416600452602490fd5b601f909101601f19168101906001600160401b038211908210176102b557604052565b634e487b7160e01b5f52604160045260245ffd5b51906001600160a01b03821682036101eb57565b6001600160401b0381116102b557601f01601f191660200190565b9061031c575080511561030d57602081519101fd5b63d6bda27560e01b5f5260045ffd5b8151158061034d575b61032d575090565b639996b31560e01b5f9081526001600160a01b0391909116600452602490fd5b50803b1561032556fe60806040527f5c60da1b000000000000000000000000000000000000000000000000000000006080526020608060048173ffffffffffffffffffffffffffffffffffffffff7f0000000000000000000000000000000000000000000000000000000000000000165afa8015610107575f9015610163575060203d602011610100575b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0601f820116608001906080821067ffffffffffffffff8311176100d3576100ce91604052608001610112565b610163565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52604160045260245ffd5b503d610081565b6040513d5f823e3d90fd5b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff80602091011261015f5760805173ffffffffffffffffffffffffffffffffffffffff8116810361015f5790565b5f80fd5b5f8091368280378136915af43d5f803e1561017c573d5ff35b3d5ffdfea164736f6c6343000824000a";

/**
 * Stamp is client-side authentication. Since the passkeys are on the user's mobile device
 * react-native-passkey helps fetch passkey for the user (provided credentialId, rpId).
 * This is exactly how the WebAuthn.sol contract needs it to be.
 */
export const _stamp = async (credentialId: string, rpId: string, payload: Hex): Promise<WebAuthnSignature> => {
	const signingOptions: PasskeyGetRequest = {
		// `Uint8Array.from` gives a fresh ArrayBuffer-backed view, matching the
		// `Uint8Array<ArrayBuffer>` that `fromBuffer` expects (viem's `hexToBytes`
		// is typed over the wider `ArrayBufferLike`).
		challenge: isoBase64URL.fromBuffer(Uint8Array.from(hexToBytes(payload))),
		allowCredentials: [{
			id: credentialId,
			type: "public-key",
			transports: [AuthenticatorTransport.internal]
		}],
		rpId,
		userVerification: "required"
	};

	let authenticationResult;
	try {
		authenticationResult = await Passkey.get(signingOptions);
	} catch (e) {
		console.log("Failed to get authenticationResult");
		console.error(JSON.stringify(e, Object.getOwnPropertyNames(e)))
		throw e;
	}

	// See https://github.com/f-23/react-native-passkey/issues/54
	// On Android the typedef lies. Authentication result is actually a string!
	// TODO: remove me once the above is resolved.
	const brokenAuthenticationResult =
		authenticationResult as BrokenPasskeyGetResult;
	if (typeof brokenAuthenticationResult === "string") {
		authenticationResult = JSON.parse(brokenAuthenticationResult);
	}

	const { clientDataJSON, authenticatorData, signature } = authenticationResult.response;

	// 1. Decode clientDataJSON
	const clientDataJSONBuffer = isoBase64URL.toBuffer(clientDataJSON);
	const clientDataJSONString = new TextDecoder().decode(clientDataJSONBuffer);

	// 2. Calculate indices for the contract (byte offsets)
	const typeSearchString = '"type":"webauthn.get"';
	const challengeSearchString = '"challenge":';

	const rawTypeIndex = clientDataJSONString.indexOf(typeSearchString);
	const challengeIndex = clientDataJSONString.indexOf(challengeSearchString);

	let typeIndex = rawTypeIndex;
	if (rawTypeIndex === -1) {
		console.warn("typeIndex not found", {
			expected: typeSearchString,
			clientDataSnippet: clientDataJSONString.slice(0, 200),
		});
		typeIndex = 0;
	}
	if (challengeIndex === -1) {
		throw new Error(`Could not find challenge substring '${challengeSearchString}' in clientDataJSON for index calculation.`);
	}

	// 3. Decode authenticatorData
	const authenticatorDataBytes = isoBase64URL.toBuffer(authenticatorData);
	const authenticatorDataHex = bytesToHex(authenticatorDataBytes);

	// 4. Decode signature (ASN.1 DER encoded)
	const signatureBytes = isoBase64URL.toBuffer(signature);
	// let parsedSignature = p256.Signature.fromDER(signatureBytes);
	let parsedSignature = p256.Signature.fromBytes(
		signatureBytes instanceof Uint8Array
			? signatureBytes
			: new Uint8Array(signatureBytes),
		"der"
	);

	// Normalize s
	const n = p256.Point.CURVE().n;
	const halfN = n >> 1n;

	const r = parsedSignature.r;
	const s = parsedSignature.s > halfN
		? n - parsedSignature.s
		: parsedSignature.s;

	const webAuthnSig =  {
		authenticatorData: authenticatorDataHex,
		clientDataJSON: clientDataJSONString,
		challengeIndex: BigInt(challengeIndex),
		typeIndex: BigInt(typeIndex),
		r: r,
		s: s
	};

	return webAuthnSig;
}

// viem keeps its Call type internal to the account abstraction module.
type Call = { to: Hex; data?: Hex | undefined; value?: bigint | undefined };

export const _encodeCalls = async (calls: readonly Call[]): Promise<Hex> => {

	const txs: { dest: Address; value: bigint; data: Hex }[] = calls.map((call) => ({
		dest: call.to as Address,
		value: call.value ?? ZERO,
		data: call.data ?? "0x"
	}));

	// executeBatch costs more calldata, so a lone call goes through execute.
	if (txs.length === 1) {
		return encodeFunctionData({
			abi: DeviceWallet,
			functionName: "execute",
			args: [txs[0]]
		});
	}

	return encodeFunctionData({
		abi: DeviceWallet,
		functionName: "executeBatch",
		args: [txs]
	});
}

export const _getFactoryArgs = async (client: WalletClient, deviceUniqueIdentifier: string, deviceWalletOwnerKey: P256Key, salt: bigint): Promise<{ factory: Address; factoryData: Hex }> => {

	const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

	const factoryData = encodeFunctionData({
		abi: DeviceWalletFactory,
		functionName: "createAccount",
		args: [deviceUniqueIdentifier, deviceWalletOwnerKey, salt],
	})

	return { factory: values.factoryAddresses.DEVICE_WALLET_FACTORY, factoryData };
}

export const getInitCodeHash = async (client: WalletClient, deviceUniqueIdentifier: string, deviceWalletOwnerKey: P256Key): Promise<Hex> => {
  
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

	const beacon = await deviceWalletFactory.read.beacon();

	// Encode the DeviceWallet.init with the init params
	const deviceWalletInitData = encodeFunctionData({
		abi: DeviceWallet,
		functionName: "init",
		args: [
			registry,
			deviceWalletOwnerKey,
			deviceUniqueIdentifier,
			eSIMWalletFactoryAddress
		]
	});

	// Encode BeaconProxy constructor args
	const beaconProxyConstructorArgs = encodeAbiParameters(
		parseAbiParameters("address, bytes"),
		[beacon as `0x${string}`, deviceWalletInitData]
	);

	// Compute initCode
  const initCode: Hex = concat([BEACON_PROXY_CREATION_CODE, beaconProxyConstructorArgs]);

	return keccak256(initCode);
}

export const getCounterFactualAddress = async (client: WalletClient, deviceUniqueIdentifier: string, deviceWalletOwnerKey: P256Key, salt: bigint):Promise<Hex> => {

	const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);
	const deviceWalletFactoryAddress = values.factoryAddresses.DEVICE_WALLET_FACTORY;

	const uniqueSaltBytes32 = toHex(salt, {size: 32});
	const initCodeHash = await getInitCodeHash(client, deviceUniqueIdentifier, deviceWalletOwnerKey);

	// Calculate deterministic address from init code hash
	const create2Address = getContractAddress({
		from: deviceWalletFactoryAddress as Address,
		salt: uniqueSaltBytes32,
		bytecodeHash: initCodeHash,
		opcode: "CREATE2",
	});

	return getAddress(create2Address) as Address;
}

/**
 * Drift guard. Recomputes the counterfactual address off-chain (using the
 * pinned {@link BEACON_PROXY_CREATION_CODE}) and compares it against the
 * on-chain `DeviceWalletFactory.getCounterFactualAddress` view - which derives
 * the address from the BeaconProxy the factory ACTUALLY deploys. A mismatch
 * means the pinned proxy bytecode (or init encoding) has drifted from the
 * deployed contract, so this throws early instead of letting a UserOp deploy to,
 * or fund, the wrong address.
 *
 * `_getSmartWallet` runs this once per chain per process; call it directly for
 * an unconditional check, e.g. right after a contract redeploy.
 */
export const _assertCounterfactualMatchesOnChain = async (
	client: WalletClient,
	deviceUniqueIdentifier: string,
	deviceWalletOwnerKey: P256Key,
	salt: bigint,
): Promise<Hex> => {
	const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

	const offChain = await getCounterFactualAddress(
		client, deviceUniqueIdentifier, deviceWalletOwnerKey, salt,
	);

	const deviceWalletFactory = getContract({
		abi: DeviceWalletFactory,
		address: values.factoryAddresses.DEVICE_WALLET_FACTORY,
		client,
	});

	// on-chain view arg order is (ownerKey, uid, salt) - differs from createAccount
	const onChain = await deviceWalletFactory.read.getCounterFactualAddress([
		deviceWalletOwnerKey,
		deviceUniqueIdentifier,
		salt,
	]) as Hex;

	if (getAddress(offChain) !== getAddress(onChain)) {
		throw new CounterfactualMismatchError(getAddress(offChain), getAddress(onChain));
	}

	return offChain;
}

export const _encodeSignature = async (webAuthnSignature: WebAuthnSignature, validUntil: number): Promise<Hex> => {

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

	const signature = encodePacked(
		["uint8", "uint48", "bytes"],
		[1, validUntil, encodedWebAuthnSignatureBytes]
	);

	return signature;
};

// The challenge the wallet's isValidSignature rebuilds before checking a passkey
// assertion. Everything the caller controls has to be inside what was signed:
// validUntil so an expired signature cannot be revived by rewriting the header,
// and the chain id and wallet address because neither is implied by the message.
// Wallets sit at the same address on every chain, and one owner key can back a
// second wallet at another salt.
const _erc1271Challenge = (
	validUntil: number,
	chainId: number,
	accountAddress: Address,
	messageHash: Hex
): Hex => hashMessage({
	raw: encodePacked(
		["uint8", "uint48", "uint256", "address", "bytes32"],
		[1, validUntil, BigInt(chainId), accountAddress, messageHash]
	)
});

// message here is the original message data (string or Uint8Array) directly from the app
export const _signMessage = async (
	message: SignableMessage,
	credentialId: string,
	rpId: string,
	chainId: number,
	accountAddress: Address
): Promise<Hex> => {

	const validUntil = Math.floor(Date.now() / 1000) + SIGNATURE_VALIDITY_SECONDS;

	// viem's SignableMessage is `string | { raw: Hex | ByteArray }`. A plain
	// string is a UTF-8 message; the `{ raw }` form is already-serialized bytes
	// (possibly a pre-computed digest). hashMessage handles both natively, so
	// forward the message as-is rather than force-casting it to a string.
	const messageHash = hashMessage(message);
	// The verifier is handed this digest and derives the challenge from it, so
	// the digest is what gets bound rather than what gets stamped.
	const payload = _erc1271Challenge(validUntil, chainId, accountAddress, messageHash);
	const webAuthnSignature = await _stamp(credentialId, rpId, payload);

	return _encodeSignature(webAuthnSignature, validUntil);
}

export const _signTypedData = async <
    const typedData extends TypedData | Record<string, unknown>,
    primaryType extends keyof typedData | "EIP712Domain" = keyof typedData
> (
	typedData: TypedDataDefinition<typedData, primaryType>,
	credentialId: string,
	rpId: string,
	chainId: number,
	accountAddress: Address
): Promise<Hex> => {

	// signature valid until, UNIX timestamp in seconds
	const validUntil = Math.floor(Date.now() / 1000) + SIGNATURE_VALIDITY_SECONDS;

	// The EIP-712 digest takes the place of the EIP-191 one, and the challenge
	// is built over it the same way. The verifier cannot tell the two apart.
	const messageHash = hashTypedData(typedData);
	const payload = _erc1271Challenge(validUntil, chainId, accountAddress, messageHash);

	const webAuthnSignature = await _stamp(credentialId, rpId, payload);

	return _encodeSignature(webAuthnSignature, validUntil);
}

export const _signUserOperationHash = async (credentialId: string, rpId: string, userOpHash: Hex): Promise<Hex> => {

	const validUntil = Math.floor(Date.now() / 1000) + SIGNATURE_VALIDITY_SECONDS;

	const messagePrecursor = encodePacked(["uint8", "uint48", "bytes32"], [
        1,
        validUntil,
        userOpHash
    ]);

	const payload = hashMessage({ raw: messagePrecursor });

	const webAuthnSignature = await _stamp(credentialId, rpId, payload);

	return _encodeSignature(webAuthnSignature, validUntil);
}

// Chains whose pinned BeaconProxy bytecode has already been checked against
// the deployed factory in this process, so repeat wallet creations on the
// same chain skip the extra RPC the drift guard costs.
const _counterfactualVerifiedChains = new Set<number>();

export const _getSmartWallet = async (
	client: WalletClient,
	credentialId: string,
	rpId: string,
	organiationId: string,
	deviceUniqueIdentifier: string,
	deviceWalletOwnerKey: P256Key,
	salt: bigint
): Promise<KokioSmartAccount> => {

	const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL);

	if (!client.account) throw new Error ('Error: No signer account found with WalletClient')

	const accountAddress = _counterfactualVerifiedChains.has(chainID)
		? await getCounterFactualAddress(client, deviceUniqueIdentifier, deviceWalletOwnerKey, salt)
		: await _assertCounterfactualMatchesOnChain(client, deviceUniqueIdentifier, deviceWalletOwnerKey, salt);
	_counterfactualVerifiedChains.add(chainID);

	const entryPointAddress = values.factoryAddresses.ENTRY_POINT;

	return toSmartAccount({
		// Reads (nonce, deployment check) go to the chain RPC, not the bundler.
		client: createPublicClient({ chain: values.chain, transport: http(values.rpcURL) }),

		entryPoint: {
			abi: entryPoint08Abi,
			address: entryPointAddress,
			version: "0.8",
		},

		getAddress: async (): Promise<Address> => accountAddress as Address,

		getFactoryArgs: async () => _getFactoryArgs(client, deviceUniqueIdentifier, deviceWalletOwnerKey, salt),

		encodeCalls: async (calls): Promise<Hex> => _encodeCalls(calls),

		// Placeholder signature for gas estimation. Must not revert validation.
		getStubSignature: async (): Promise<Hash> => "0x",

		signMessage: async ({ message }): Promise<Hash> =>
			_signMessage(message, credentialId, rpId, chainID, accountAddress as Address),

		signTypedData: async (typedData): Promise<Hash> =>
			_signTypedData(typedData, credentialId, rpId, chainID, accountAddress as Address),

		signUserOperation: async ({ chainId = chainID, ...userOperation }): Promise<Hash> => {
			const userOpHash = getUserOperationHash({
				chainId,
				entryPointAddress,
				entryPointVersion: "0.8",
				userOperation: {
					...userOperation,
					sender: userOperation.sender ?? (accountAddress as Address),
				} as UserOperation<"0.8">,
			});

			return _signUserOperationHash(credentialId, rpId, userOpHash);
		},
	});
}

const BUNDLER_METHODS = new Set([
	"eth_sendUserOperation",
	"eth_estimateUserOperationGas",
	"eth_getUserOperationReceipt",
	"eth_getUserOperationByHash",
	"eth_supportedEntryPoints",
]);

// Routes bundler calls to Pimlico and everything else to the chain RPC. viem
// ships no split transport, and the returned client needs both: the SDK reads
// contracts through the same client it sends user operations with.
const _splitTransport = (pimlicoRpcURL: string, rpcURL: string): Transport => {

	const bundler = http(pimlicoRpcURL)({});
	const rpc = http(rpcURL)({});

	return ({ retryCount }) => createTransport(
		{
			key: "split",
			name: "Split",
			type: "split",
			retryCount,
			request: (async ({ method, params }: { method: string; params?: unknown }) =>
				BUNDLER_METHODS.has(method)
					? bundler.request({ method, params } as never)
					: rpc.request({ method, params } as never)) as EIP1193RequestFn,
		},
		// Chain constants are resolved from client.transport.url, so the chain
		// RPC has to stay readable here.
		{ url: rpcURL },
	);
}

export const _getSmartWalletClient = async (client: WalletClient, pimlicoAPIKey: string, gasPolicyId: string, account: KokioSmartAccount): Promise<KokioSmartAccountClient> => {

	const chainID = await client.getChainId();
	const rpcURL = client.transport.url;
	const values = _getChainSpecificConstants(chainID, rpcURL, pimlicoAPIKey);

	// Pimlico sponsors via ERC-7677, keyed by the gas policy.
	const paymaster = createPaymasterClient({ transport: http(values.pimlicoRpcURL) });

	return createBundlerClient({
		account,
		chain: values.chain,
		client: createPublicClient({ chain: values.chain, transport: http(values.rpcURL) }),
		transport: _splitTransport(values.pimlicoRpcURL, values.rpcURL),
		paymaster,
		paymasterContext: { policyId: gasPolicyId },
	// extend() keeps the bundler fields at runtime but drops them from the
	// inferred type, so the result is re-asserted rather than narrowed.
	}).extend(publicActions) as unknown as KokioSmartAccountClient;
}
