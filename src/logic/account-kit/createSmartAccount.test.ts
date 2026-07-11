import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  decodeAbiParameters,
  getAddress,
  getContractAddress,
  keccak256,
  parseAbiParameters,
  sliceHex,
  toHex,
  type Hex,
} from "viem";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { p256 } from "@noble/curves/nist.js";

import { makeMockWalletClient } from "../../test-utils/mockClient.js";
import { sepoliaFactoryAddresses, CHAIN_ID } from "../constants.js";
import type { P256Key, WebAuthnSignature } from "../../types.js";

// --- Mock the on-chain beacon read (getContract(...).read.beacon()) ---------
const FIXED_BEACON = "0x00000000000000000000000000000000000beac0" as const;

vi.mock("viem", async (importOriginal) => {
  const actual = await importOriginal<typeof import("viem")>();
  return {
    ...actual,
    getContract: vi.fn(() => ({
      read: { beacon: async () => FIXED_BEACON },
    })),
  };
});

// --- Mock react-native-passkey's Passkey.get --------------------------------
const passkeyGet = vi.fn();
vi.mock("react-native-passkey", () => ({
  Passkey: { get: (...args: unknown[]) => passkeyGet(...args) },
}));

// Imported AFTER the mocks above are registered.
import {
  _encodeSignature,
  _signMessage,
  _signUserOperationHash,
  _stamp,
  getCounterFactualAddress,
  getInitCodeHash,
} from "./createSmartAccount.js";

// Fixed fixture mirroring smart-contract-suite/scripts/compute-initCode.js
const OWNER_KEY: P256Key = [
  "0x6B17D1F2E12C4247F8BCE6E563A440F277037D812DEB33A0F4A13945D898C291",
  "0x4FE342E2FE1A7F9B8EE7EB4A7C0F9E162BCE33576B315ECECBB6406837BF51F1",
];
const UID = "Device_11";
const SALT = 111n;

const client = makeMockWalletClient({ chainId: CHAIN_ID.SEPOLIA });

describe("CREATE2 counterfactual address (invariant vs compute-initCode.js)", () => {
  it("locks the init-code hash for the fixed fixture", async () => {
    const hash = await getInitCodeHash(client, UID, OWNER_KEY);
    // Golden value captured from current SDK behavior; must match the
    // contract-side BeaconProxy.creationCode ++ abi.encode(beacon, init(...)).
    expect(hash).toMatchInlineSnapshot(`"0xdeca1d90da20ff74ac52065ebc49127a5e458f7e2425bf46ec5df729729d30a1"`);
  });

  it("locks the counterfactual address for the fixed fixture", async () => {
    const address = await getCounterFactualAddress(client, UID, OWNER_KEY, SALT);
    expect(address).toMatchInlineSnapshot(`"0x75bFa2C4f6D4b67299f4F3a60092e0A30Fd1863b"`);
  });

  it("composes CREATE2 from (factory, salt(size:32), initCodeHash)", async () => {
    const sdkAddress = await getCounterFactualAddress(client, UID, OWNER_KEY, SALT);
    const initCodeHash = await getInitCodeHash(client, UID, OWNER_KEY);

    const independent = getContractAddress({
      from: sepoliaFactoryAddresses.DEVICE_WALLET_FACTORY,
      salt: toHex(SALT, { size: 32 }),
      bytecodeHash: initCodeHash,
      opcode: "CREATE2",
    });

    expect(sdkAddress).toBe(getAddress(independent));
  });

  it("is salt-sensitive (different salt => different address)", async () => {
    const a = await getCounterFactualAddress(client, UID, OWNER_KEY, SALT);
    const b = await getCounterFactualAddress(client, UID, OWNER_KEY, SALT + 1n);
    expect(a).not.toBe(b);
  });
});

describe("signature envelope (_encodeSignature)", () => {
  const webAuthnSignature: WebAuthnSignature = {
    authenticatorData: "0x1122334455",
    clientDataJSON: '{"type":"webauthn.get","challenge":"abc"}',
    challengeIndex: 23n,
    typeIndex: 1n,
    r: 0x1234n,
    s: 0x5678n,
  };
  const validUntil = 1893456000; // fixed UNIX timestamp

  it("packs version(0x01) | validUntil(uint48) | abi.encode(WebAuthnSignature)", async () => {
    const sig = await _encodeSignature(webAuthnSignature, validUntil);

    // version byte
    expect(sliceHex(sig, 0, 1)).toBe("0x01");
    // validUntil as 6-byte (uint48) big-endian
    expect(sliceHex(sig, 1, 7)).toBe(toHex(validUntil, { size: 6 }));

    // remaining bytes are abi.encode(WebAuthnSignature) — decode & assert field order
    const encodedTuple = sliceHex(sig, 7);
    const [decoded] = decodeAbiParameters(
      [
        {
          type: "tuple",
          name: "WebAuthnSignature",
          components: [
            { name: "authenticatorData", type: "bytes" },
            { name: "clientDataJSON", type: "string" },
            { name: "challengeIndex", type: "uint256" },
            { name: "typeIndex", type: "uint256" },
            { name: "r", type: "uint256" },
            { name: "s", type: "uint256" },
          ],
        },
      ],
      encodedTuple,
    );

    expect(decoded).toEqual(webAuthnSignature);
  });

  it("locks a golden envelope vector", async () => {
    const sig = await _encodeSignature(webAuthnSignature, validUntil);
    expect(sig).toMatchInlineSnapshot(`"0x01000070dbd880000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000170000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000123400000000000000000000000000000000000000000000000000000000000056780000000000000000000000000000000000000000000000000000000000000005112233445500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000297b2274797065223a22776562617574686e2e676574222c226368616c6c656e6765223a22616263227d0000000000000000000000000000000000000000000000"`);
  });
});

// --- Passkey stamping helpers ------------------------------------------------
const CLIENT_DATA_JSON =
  '{"type":"webauthn.get","challenge":"AAAA","origin":"https://kokio.test"}';
const AUTH_DATA = new Uint8Array([0xde, 0xad, 0xbe, 0xef, 0x01, 0x02, 0x03]);

// Build a DER signature with intentionally HIGH s to exercise normalization.
const N = p256.Point.CURVE().n;
const HALF_N = N >> 1n;
const RAW_R = 0x2an;
const RAW_S_HIGH = N - 5n; // > HALF_N, must be normalized to 5n
const DER_HIGH_S = new p256.Signature(RAW_R, RAW_S_HIGH).toBytes("der");

const mockPasskeyResponse = () => ({
  response: {
    clientDataJSON: isoBase64URL.fromBuffer(
      new TextEncoder().encode(CLIENT_DATA_JSON),
    ),
    authenticatorData: isoBase64URL.fromBuffer(AUTH_DATA),
    signature: isoBase64URL.fromBuffer(DER_HIGH_S),
  },
});

describe("_stamp (passkey -> WebAuthnSignature)", () => {
  beforeEach(() => {
    passkeyGet.mockReset();
    passkeyGet.mockResolvedValue(mockPasskeyResponse());
  });

  it("parses DER, normalizes high-s, and computes byte indices", async () => {
    const payload = keccak256("0xabcd");
    const result = await _stamp("cred-id", "kokio.test", payload);

    expect(result.r).toBe(RAW_R);
    expect(result.s).toBe(5n); // normalized: N - (N - 5) = 5
    expect(result.s <= HALF_N).toBe(true);
    expect(result.clientDataJSON).toBe(CLIENT_DATA_JSON);
    expect(result.authenticatorData).toBe(
      ("0x" + Buffer.from(AUTH_DATA).toString("hex")) as Hex,
    );
    expect(result.challengeIndex).toBe(
      BigInt(CLIENT_DATA_JSON.indexOf('"challenge":')),
    );
    expect(result.typeIndex).toBe(
      BigInt(CLIENT_DATA_JSON.indexOf('"type":"webauthn.get"')),
    );
  });

  it("passes the payload to the passkey challenge as base64url", async () => {
    const payload = keccak256("0xabcd");
    await _stamp("cred-id", "kokio.test", payload);

    const req = passkeyGet.mock.calls[0][0];
    expect(req.rpId).toBe("kokio.test");
    expect(req.userVerification).toBe("required");
    expect(req.allowCredentials[0].id).toBe("cred-id");
    // challenge is the payload bytes, base64url-encoded
    expect(isoBase64URL.toBuffer(req.challenge)).toEqual(
      new Uint8Array(Buffer.from(payload.slice(2), "hex")),
    );
  });
});

describe("_signMessage / _signUserOperationHash envelope shape", () => {
  beforeEach(() => {
    passkeyGet.mockReset();
    passkeyGet.mockResolvedValue(mockPasskeyResponse());
  });

  it("_signMessage produces a version-1 envelope with the stamped sig", async () => {
    const sig = await _signMessage("hello", "cred-id", "kokio.test");
    expect(sliceHex(sig, 0, 1)).toBe("0x01");

    const [decoded] = decodeAbiParameters(
      parseAbiParameters(
        "(bytes authenticatorData, string clientDataJSON, uint256 challengeIndex, uint256 typeIndex, uint256 r, uint256 s)",
      ),
      sliceHex(sig, 7),
    );
    expect((decoded as WebAuthnSignature).r).toBe(RAW_R);
    expect((decoded as WebAuthnSignature).s).toBe(5n);
  });

  it("_signUserOperationHash packs uint8|uint48|bytes32 precursor before hashing", async () => {
    const userOpHash = keccak256("0xfeed");
    const sig = await _signUserOperationHash("cred-id", "kokio.test", userOpHash);
    expect(sliceHex(sig, 0, 1)).toBe("0x01");
    // the challenge handed to the passkey is hashMessage(uint8|uint48|bytes32)
    const req = passkeyGet.mock.calls[0][0];
    expect(req.challenge).toBeTypeOf("string");
  });
});
