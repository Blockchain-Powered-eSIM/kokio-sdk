import { assertActivityCompleted, assertNonNull, TurnkeyClient, TActivityResponse } from "@turnkey/http"
import { Address, hashMessage, hashTypedData, SignableMessage, toHex, TypedData, TypedDataDefinition } from "viem";
import { decodeAttestationObject, decodeClientDataJSON, isoBase64URL, parseAuthenticatorData } from "@simplewebauthn/server/helpers";
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
    
    console.log("SDK message to be signed: ", message);
    const payload = hashMessage(message);
    console.log("SDK payload: ", payload);
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
        console.log("SDK signedRequest: ", signedRequest, "\n", JSON.stringify(signedRequest, null, 2));
    }
    catch (e) {
        console.log("SDK error with signedRequest: ", e);
    }

    if (!signedRequest)
        throw new Error('Error: Failed to get signed request');
    const stampedHeaderValue = JSON.parse(signedRequest.stamp.stampHeaderValue);
    console.log("SDK stampedHeaderValue: ", JSON.stringify(stampedHeaderValue, null, 2));
    let response;
    try {
        // response = await client.request('/api/v1/submit/sign_raw_payload', JSON.parse(signedRequest.body));
        // console.log("SDK response: ", JSON.stringify(response, null, 2));
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
        console.log("SDK response for stampedRequest: ", JSON.stringify(res, null, 2));
        const responseData = await res.json();
        console.log("SDK stamped and signed responseData: ", responseData, "\n\n\n", JSON.stringify(responseData, null, 2));
        response = responseData;
    }
    catch (e) {
        console.log("SDK error with response: ", e);
    }
    // if (!response || !response.activity)
    //     throw new Error('Error: Failed to sign payload');
    // const activity = response.activity;
    // console.log("SDK activity: ", JSON.stringify(activity, null, 2));
    // try {
    //     assertActivityCompleted(activity);
    // }
    // catch (e) {
    //     console.log("SDK error with assertActivityCompleted: ", e);
    // }
    console.log("*************************************************************")
    const authenticatorData = isoBase64URL.toBuffer(stampedHeaderValue.authenticatorData);
    console.log("SDK authenticatorData: ", toHex(authenticatorData));
    
    const decodedClientDataJson = decodeClientDataJSON(stampedHeaderValue.clientDataJson);
    console.log("SDK decodedClientDataJson: ", JSON.stringify(decodedClientDataJson, null, 2));
    
    const typeIndex = JSON.stringify(decodedClientDataJson).indexOf('"type":"webauthn.get"');
    console.log("SDK typeIndex: ", typeIndex);
    const challengeIndex = JSON.stringify(decodedClientDataJson).indexOf('"challenge":');
    console.log("challengeIndex: ", challengeIndex);
    if (typeIndex === -1 || challengeIndex === -1) {
        throw new Error("Could not find type or challenge in clientDataJSON");
    }

    const signature = assertNonNull(response.activity.result.signRawPayloadResult);
    console.log("SDK signature: ", JSON.stringify(signature, null, 2));
    const webAuthnSignature = {
        authenticatorData: toHex(authenticatorData),
        clientDataJSON: JSON.stringify(decodedClientDataJson),
        challengeIndex: BigInt(challengeIndex),
        typeIndex: BigInt(typeIndex),
        r: BigInt(`0x${signature.r}`),
        s: BigInt(`0x${signature.s}`)
    }
    console.log('WebAuthn signature: \n', webAuthnSignature);
    return {
        authenticatorData: toHex(authenticatorData),
        clientDataJSON: JSON.stringify(decodedClientDataJson),
        challengeIndex: BigInt(challengeIndex),
        typeIndex: BigInt(typeIndex),
        r: BigInt(`0x${signature.r}`),
        s: BigInt(`0x${signature.s}`)
    };
}

export const _stampAndSignTypedDataWithTurnkey = async <
    const typedData extends TypedData | Record<string, unknown>,
    primaryType extends keyof typedData | "EIP712Domain" = keyof typedData
> (client: TurnkeyClient, organizationId: string, signWith: Address, typedData: TypedDataDefinition<typedData, primaryType>): Promise<WebAuthnSignature> => {
    
    console.log("SDK TypedData to be signed: ", typedData);
    const payload = hashTypedData(typedData);
    console.log("SDK payload: ", payload);
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
        console.log("SDK signedRequest: ", signedRequest, "\n", JSON.stringify(signedRequest, null, 2));
    }
    catch (e) {
        console.log("SDK error with signedRequest: ", e);
    }

    if (!signedRequest)
        throw new Error('Error: Failed to get signed request');
    const stampedHeaderValue = JSON.parse(signedRequest.stamp.stampHeaderValue);
    console.log("SDK stampedHeaderValue: ", JSON.stringify(stampedHeaderValue, null, 2));
    let response;
    try {
        // response = await client.request('/api/v1/submit/sign_raw_payload', JSON.parse(signedRequest.body));
        // console.log("SDK response: ", JSON.stringify(response, null, 2));
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
        console.log("SDK response for stampedRequest: ", JSON.stringify(res, null, 2));
        const responseData = await res.json();
        console.log("SDK stamped and signed responseData: ", responseData, "\n\n\n", JSON.stringify(responseData, null, 2));
        response = responseData;
    }
    catch (e) {
        console.log("SDK error with response: ", e);
    }
    // if (!response || !response.activity)
    //     throw new Error('Error: Failed to sign payload');
    // const activity = response.activity;
    // console.log("SDK activity: ", JSON.stringify(activity, null, 2));
    // try {
    //     assertActivityCompleted(activity);
    // }
    // catch (e) {
    //     console.log("SDK error with assertActivityCompleted: ", e);
    // }
    console.log("*************************************************************")
    const authenticatorData = isoBase64URL.toBuffer(stampedHeaderValue.authenticatorData);
    console.log("SDK authenticatorData: ", toHex(authenticatorData));
    const decodedClientDataJson = decodeClientDataJSON(stampedHeaderValue.clientDataJson);
    console.log("SDK decodedClientDataJson: ", JSON.stringify(decodedClientDataJson, null, 2));
    const signature = assertNonNull(response.activity.result.signRawPayloadResult);
    console.log("SDK signature: ", JSON.stringify(signature, null, 2));
    const webAuthnSignature = {
        authenticatorData: toHex(authenticatorData),
        clientDataJSON: JSON.stringify(decodedClientDataJson),
        challengeIndex: BigInt(23),
        typeIndex: BigInt(1),
        r: BigInt(`0x${signature.r}`),
        s: BigInt(`0x${signature.s}`)
    }
    console.log('WebAuthn signature: \n', webAuthnSignature)
    return {
        authenticatorData: toHex(authenticatorData),
        clientDataJSON: JSON.stringify(decodedClientDataJson),
        challengeIndex: BigInt(23),
        typeIndex: BigInt(1),
        r: BigInt(`0x${signature.r}`),
        s: BigInt(`0x${signature.s}`)
    };
}
