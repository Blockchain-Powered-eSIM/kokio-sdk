import { assertActivityCompleted, assertNonNull, TurnkeyClient, TActivityResponse } from "@turnkey/http"
import { Address, hashMessage, hashTypedData, Hex, hexToBytes, SignableMessage, toHex, TypedData, TypedDataDefinition, bytesToHex } from "viem";
import { decodeAttestationObject, decodeClientDataJSON, isoBase64URL, parseAuthenticatorData } from "@simplewebauthn/server/helpers";
import { _add0x, base64UrlToBuffer, parseSignature } from "../utils.js";
import { WebAuthnSignature } from "../../types.js";
import { Passkey, PasskeyGetResult } from "react-native-passkey";
import { p256 } from "@noble/curves/p256";
import { AuthenticatorTransport } from "@turnkey/react-native-passkey-stamper";

type BrokenPasskeyGetResult = PasskeyGetResult | string;

/*
** Stamp is client-side authentication. Since the passkeys are one the user's mobile device
** react-native-passkey helps fetch passkey for the user (provided credentialId, rpId).
** This is exactly how the WebAuthn.sol contract needs it to be.
*/
export const _stamp = async (credentialId: string, rpId: string, payload: Hex): Promise<WebAuthnSignature> => {
    const signingOptions = {
        challenge: isoBase64URL.fromBuffer(hexToBytes(payload)), // Base64URL of the raw EIP-191 hash bytes
        allowCredentials: [{
            id: credentialId,
            type: 'public-key',
            transports: [AuthenticatorTransport.internal]
        }],
        rpId: rpId,
        userVerification: "required"
    };

    let authenticationResult;
    try {
        authenticationResult = await Passkey.get(signingOptions);
    } catch (e) {
        console.log("Failed to get authenticationResult");
        console.error(JSON.stringify(e, Object.getOwnPropertyNames(e)))
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

    const typeIndex = clientDataJSONString.indexOf(typeSearchString);
    const challengeIndex = clientDataJSONString.indexOf(challengeSearchString);

    if (typeIndex === -1) {
        console.warn(`Warning: Could not find type substring '${typeSearchString}' in clientDataJSON. Setting typeIndex to 0.`);
    }
    if (challengeIndex === -1) {
        throw new Error(`Could not find challenge substring '${challengeSearchString}' in clientDataJSON for index calculation.`);
    }

    // 3. Decode authenticatorData
    const authenticatorDataBytes = isoBase64URL.toBuffer(authenticatorData);
    const authenticatorDataHex = bytesToHex(authenticatorDataBytes);

    // 4. Decode signature (ASN.1 DER encoded)
    const signatureBytes = isoBase64URL.toBuffer(signature);
    let parsedSignature = p256.Signature.fromDER(signatureBytes);
    parsedSignature = parsedSignature.normalizeS();
    let r = parsedSignature.r;
    let s = parsedSignature.s;

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

const getBytesFromPayload = (payloadHex: Hex): Uint8Array => {
    return hexToBytes(payloadHex);
};

export const _signMessageWithTurnkey = async (client: TurnkeyClient, organizationId: string, signWith: Address, message: SignableMessage): Promise<WebAuthnSignature> => {
    
    const payload = hashMessage(message);
    
    const { activity } = await client.signRawPayload({
        type: "ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2",
        organizationId: organizationId,
        parameters: {
            signWith: signWith,
            payload: payload,
            encoding: "PAYLOAD_ENCODING_HEXADECIMAL",
            hashFunction: "HASH_FUNCTION_NO_OP",
        },
        timestampMs: String(Date.now()), // millisecond timestamp
    });

    assertActivityCompleted(activity);

    const attestationObject = assertNonNull(activity.intent.createOrganizationIntent?.rootAuthenticator.attestation.response.attestationObject);
    const decodedAttestationObj = decodeAttestationObject(base64UrlToBuffer(attestationObject))

    const clientDataJson = assertNonNull(activity.intent.createOrganizationIntent?.rootAuthenticator.attestation.response.clientDataJson);
    const decodedClientDataJson = decodeClientDataJSON(clientDataJson);

    const signature = assertNonNull(activity.result.signRawPayloadResult);

    return {
        authenticatorData: toHex(decodedAttestationObj.get("authData")),
        clientDataJSON: JSON.stringify(decodedClientDataJson),
        challengeIndex: BigInt(23),
        typeIndex: BigInt(1),
        r: BigInt(signature.r),
        s: BigInt(signature.s) 
    }
} 

export const _signTypedDataWithTurnkey = async <
    const typedData extends TypedData | Record<string, unknown>,
    primaryType extends keyof typedData | "EIP712Domain" = keyof typedData
> (client: TurnkeyClient, organizationId: string, signWith: Address, typedData: TypedDataDefinition<typedData, primaryType>): Promise<WebAuthnSignature> => {
    
    const payload = hashTypedData(typedData);
    
    const { activity } = await client.signRawPayload({
        type: "ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2",
        organizationId: organizationId,
        parameters: {
            signWith: signWith,
            payload: payload,
            encoding: "PAYLOAD_ENCODING_HEXADECIMAL",
            hashFunction: "HASH_FUNCTION_NO_OP",
        },
        timestampMs: String(Date.now()), // millisecond timestamp
    });

    assertActivityCompleted(activity);

    const attestationObject = assertNonNull(activity.intent.createOrganizationIntent?.rootAuthenticator.attestation.response.attestationObject);
    const decodedAttestationObj = decodeAttestationObject(base64UrlToBuffer(attestationObject))

    const clientDataJson = assertNonNull(activity.intent.createOrganizationIntent?.rootAuthenticator.attestation.response.clientDataJson);
    const decodedClientDataJson = decodeClientDataJSON(clientDataJson);

    const signature = assertNonNull(activity.result.signRawPayloadResult);

    return {
        authenticatorData: toHex(decodedAttestationObj.get("authData")),
        clientDataJSON: JSON.stringify(decodedClientDataJson),
        challengeIndex: BigInt(23),
        typeIndex: BigInt(1),
        r: BigInt(signature.r),
        s: BigInt(signature.s) 
    }
}

export const _stampAndSignMessageWithTurnkey = async (client: TurnkeyClient, organizationId: string, signWith: Address, payload: SignableMessage): Promise<WebAuthnSignature> => {
    let signedRequest;
    try {
        signedRequest = await client.stampSignRawPayload({
            type: "ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2",
            organizationId: organizationId,
            parameters: {
                signWith: signWith,
                payload: `${payload}`,
                encoding: "PAYLOAD_ENCODING_HEXADECIMAL",
                hashFunction: "HASH_FUNCTION_NO_OP",
            },
            timestampMs: String(Date.now()), // millisecond timestamp
        });
    }
    catch (e) {
        console.log("SDK error with signedRequest: ", e);
    }
    if (!signedRequest)
        throw new Error('Error: Failed to get signed request');

    const stampedHeaderValue = JSON.parse(signedRequest.stamp.stampHeaderValue);
    let response;
    try {
        const res = await fetch(signedRequest.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                [signedRequest.stamp.stampHeaderName]: signedRequest.stamp.stampHeaderValue
            },
            body: signedRequest.body
        });
        if (!res.ok) {
            const errorBody = await res.text();
            throw new Error(`SDK Turnkey API request failed: ${res.status} ${res.statusText} - ${errorBody}`);
        }
        const responseData = await res.json();
        response = responseData;
    }
    catch (e) {
        console.log("SDK error with response: ", e);
    }

    const authenticatorData = isoBase64URL.toBuffer(stampedHeaderValue.authenticatorData);
    const decodedClientDataJson = decodeClientDataJSON(stampedHeaderValue.clientDataJson);
    // `payload` here is the hex string (e.g., "0x...") that was sent to Turnkey
    // const originalPayloadBytes = Buffer.from(payload.startsWith('0x') ? payload.substring(2) : payload, 'hex');
    const originalPayloadBytes = getBytesFromPayload(payload as Hex);
    // Replace the challenge in decodedClientDataJson with the Base64URL of the *actual bytes*
    // isoBase64URL.fromBuffer from simplewebauthn/server removes padding, which is standard for WebAuthn.
    decodedClientDataJson.challenge = isoBase64URL.fromBuffer(originalPayloadBytes);
    const typeIndex = JSON.stringify(decodedClientDataJson).indexOf('"type":"webauthn.get"');
    const challengeIndex = JSON.stringify(decodedClientDataJson).indexOf('"challenge":');
    if (typeIndex === -1 || challengeIndex === -1) {
        throw new Error("Could not find type or challenge in clientDataJSON");
    }
    const signature = assertNonNull(response.activity.result.signRawPayloadResult);

    return {
        authenticatorData: toHex(authenticatorData),
        clientDataJSON: JSON.stringify(decodedClientDataJson),
        challengeIndex: BigInt(challengeIndex),
        typeIndex: BigInt(typeIndex),
        r: BigInt(_add0x(signature.r)),
        s: BigInt(_add0x(signature.s))
    };
}

export const _stampAndSignTypedDataWithTurnkey = async <
    const typedData extends TypedData | Record<string, unknown>,
    primaryType extends keyof typedData | "EIP712Domain" = keyof typedData
> (client: TurnkeyClient, organizationId: string, signWith: Address, typedData: TypedDataDefinition<typedData, primaryType>): Promise<WebAuthnSignature> => {
    const payload = hashTypedData(typedData);
    let signedRequest;
    try {
        signedRequest = await client.stampSignRawPayload({
            type: "ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2",
            organizationId: organizationId,
            parameters: {
                signWith: signWith,
                payload: payload,
                encoding: "PAYLOAD_ENCODING_HEXADECIMAL",
                hashFunction: "HASH_FUNCTION_NO_OP",
            },
            timestampMs: String(Date.now()), // millisecond timestamp
        });
    }
    catch (e) {
        console.log("SDK error: stampAndSignTypedData");
        console.error(e);
    }

    if (!signedRequest)
        throw new Error('Error: Failed to get signed request');
    const stampedHeaderValue = JSON.parse(signedRequest.stamp.stampHeaderValue);
    let response;
    try {
        const res = await fetch(signedRequest.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                [signedRequest.stamp.stampHeaderName]: signedRequest.stamp.stampHeaderValue
            },
            body: signedRequest.body
        });
        if (!res.ok) {
            const errorBody = await res.text();
            throw new Error(`SDK Turnkey API request failed: ${res.status} ${res.statusText} - ${errorBody}`);
        }
        const responseData = await res.json();
        response = responseData;
    }
    catch (e) {
        console.log("SDK error with response: ", e);
    }

    const authenticatorData = isoBase64URL.toBuffer(stampedHeaderValue.authenticatorData);
    const decodedClientDataJson = decodeClientDataJSON(stampedHeaderValue.clientDataJson);
    const signature = assertNonNull(response.activity.result.signRawPayloadResult);

    return {
        authenticatorData: toHex(authenticatorData),
        clientDataJSON: JSON.stringify(decodedClientDataJson),
        challengeIndex: BigInt(23),
        typeIndex: BigInt(1),
        r: BigInt(_add0x(signature.r)),
        s: BigInt(_add0x(signature.s))
    };
}
