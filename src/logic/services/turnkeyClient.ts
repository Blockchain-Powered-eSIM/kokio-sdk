import { assertActivityCompleted, assertNonNull, TurnkeyClient, TActivityResponse } from "@turnkey/http"
import { Address, hashMessage, hashTypedData, SignableMessage, toHex, TypedData, TypedDataDefinition } from "viem";
import { decodeAttestationObject, decodeClientDataJSON, parseAuthenticatorData } from "@simplewebauthn/server/helpers";
import { base64UrlToBuffer } from "../utils.js";
import { WebAuthnSignature } from "../../types.js";

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

export const _stampAndSignMessageWithTurnkey = async (client: TurnkeyClient, organizationId: string, signWith: Address, message: SignableMessage): Promise<WebAuthnSignature> => {
    
    const payload = hashMessage(message);
    
    const signedRequest = await client.stampSignRawPayload({
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

    if (!signedRequest) throw new Error('Error: Failed to get signed request')
    
    const stampedHeaderValue = JSON.parse(signedRequest.stamp.stampHeaderValue);

    const response:TActivityResponse = await client.request('/public/v1/submit/sign_raw_payload', signedRequest)

    if (!response || !response.activity) throw new Error('Error: Failed to sign payload');

    const activity = response.activity;

    assertActivityCompleted(activity);

    const authenticatorData = base64UrlToBuffer(stampedHeaderValue.authenticatorData);
    const decodedClientDataJson = decodeClientDataJSON(stampedHeaderValue.clientDataJson);

    const signature = assertNonNull(activity.result.signRawPayloadResult);

    return {
        authenticatorData: toHex(authenticatorData),
        clientDataJSON: JSON.stringify(decodedClientDataJson),
        challengeIndex: BigInt(23),
        typeIndex: BigInt(1),
        r: BigInt(signature.r),
        s: BigInt(signature.s) 
    }
} 

export const _stampAndSignTypedDataWithTurnkey = async <
    const typedData extends TypedData | Record<string, unknown>,
    primaryType extends keyof typedData | "EIP712Domain" = keyof typedData
> (client: TurnkeyClient, organizationId: string, signWith: Address, typedData: TypedDataDefinition<typedData, primaryType>): Promise<WebAuthnSignature> => {
    
    const payload = hashTypedData(typedData);
    
    const signedRequest = await client.stampSignRawPayload({
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

    if (!signedRequest) throw new Error('Error: Failed to get signed request')
    
    const stampedHeaderValue = JSON.parse(signedRequest.stamp.stampHeaderValue);

    const response:TActivityResponse = await client.request('/public/v1/submit/sign_raw_payload', signedRequest)

    if (!response || !response.activity) throw new Error('Error: Failed to sign payload');

    const activity = response.activity;

    assertActivityCompleted(activity);

    const authenticatorData = base64UrlToBuffer(stampedHeaderValue.authenticatorData);
    const decodedClientDataJson = decodeClientDataJSON(stampedHeaderValue.clientDataJson);
    const signature = assertNonNull(activity.result.signRawPayloadResult);

    return {
        authenticatorData: toHex(authenticatorData),
        clientDataJSON: JSON.stringify(decodedClientDataJson),
        challengeIndex: BigInt(23),
        typeIndex: BigInt(1),
        r: BigInt(signature.r),
        s: BigInt(signature.s) 
    }
}
