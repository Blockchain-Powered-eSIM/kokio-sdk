import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  decodeAbiParameters,
  encodeFunctionData,
  encodePacked,
  getAddress,
  getContractAddress,
  hashMessage,
  hashTypedData,
  hexToNumber,
  keccak256,
  parseAbiParameters,
  size,
  sliceHex,
  toHex,
  type Address,
  type Hex,
  type TypedDataDefinition,
} from "viem";
import {
  getUserOperationHash,
  getUserOperationTypedData,
} from "viem/account-abstraction";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { p256 } from "@noble/curves/nist.js";

import { makeMockWalletClient } from "../../utils/mockClient.js";
import { DeviceWallet, DeviceWalletFactory } from "../../../src/abis/index.js";
import {
  baseSepoliaFactoryAddresses,
  CHAIN_ID,
  STUB_PRE_VERIFICATION_GAS_PAD,
  STUB_VERIFICATION_GAS_PAD,
} from "../../../src/logic/constants.js";
import type { P256Key, WebAuthnSignature } from "../../../src/types.js";

// --- Mock the on-chain beacon read (getContract(...).read.beacon()) ---------
const FIXED_BEACON = "0x00000000000000000000000000000000000beac0" as const;

// The on-chain getCounterFactualAddress view is configurable per-test so the
// drift-guard tests can force a match / mismatch.
const onChainCounterfactual = vi.fn<() => Promise<`0x${string}`>>();

vi.mock("viem", async (importOriginal) => {
  const actual = await importOriginal<typeof import("viem")>();
  return {
    ...actual,
    getContract: vi.fn(() => ({
      read: {
        beacon: async () => FIXED_BEACON,
        getCounterFactualAddress: async () => onChainCounterfactual(),
      },
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
  _assertCounterfactualMatchesOnChain,
  _encodeCalls,
  _encodeSignature,
  _getFactoryArgs,
  _padGasEstimate,
  _signMessage,
  _signTypedData,
  _signUserOperationHash,
  _stamp,
  BEACON_PROXY_CREATION_CODE,
  getCounterFactualAddress,
  getInitCodeHash,
} from "../../../src/logic/account-kit/createSmartAccount.js";

// Fixed fixture mirroring smart-contract-suite/scripts/compute-initCode.js
const OWNER_KEY: P256Key = [
  "0x6B17D1F2E12C4247F8BCE6E563A440F277037D812DEB33A0F4A13945D898C291",
  "0x4FE342E2FE1A7F9B8EE7EB4A7C0F9E162BCE33576B315ECECBB6406837BF51F1",
];
const UID = "Device_11";
const SALT = 111n;

const client = makeMockWalletClient({ chainId: CHAIN_ID.BASE_SEPOLIA });

describe("CREATE2 counterfactual address (invariant vs compute-initCode.js)", () => {
  it("locks the init-code hash for the fixed fixture", async () => {
    const hash = await getInitCodeHash(client, UID, OWNER_KEY);
    // Golden value captured from current SDK behavior; must match the
    // contract-side BeaconProxy.creationCode ++ abi.encode(beacon, init(...)).
    expect(hash).toMatchInlineSnapshot(`"0x5889afcff15d87c5b2477f47d6b48c79c05441d43a850039003d42dea62a5e81"`);
  });

  it("locks the counterfactual address for the fixed fixture", async () => {
    const address = await getCounterFactualAddress(client, UID, OWNER_KEY, SALT);
    expect(address).toMatchInlineSnapshot(`"0x15b5045C823D503974F9a1cEC120525F4302cFC0"`);
  });

  it("composes CREATE2 from (factory, salt(size:32), initCodeHash)", async () => {
    const sdkAddress = await getCounterFactualAddress(client, UID, OWNER_KEY, SALT);
    const initCodeHash = await getInitCodeHash(client, UID, OWNER_KEY);

    const independent = getContractAddress({
      from: baseSepoliaFactoryAddresses.DEVICE_WALLET_FACTORY,
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

describe("pinned BeaconProxy creation code", () => {
  it("locks the pinned bytecode (guards against silent edits to the literal)", () => {
    // keccak of the pinned creation code - matches the BeaconProxy in
    // deployments/base-sepolia-84532-entrypoint-v8.json, solc 0.8.36 viaIR.
    // A diff here means the pin moved.
    expect(keccak256(BEACON_PROXY_CREATION_CODE)).toMatchInlineSnapshot(
      `"0xc571dd76379a732e12f1973fa9f4cbbaeb1702bb0ace06e5beb7e2b56cd03c6b"`,
    );
  });
});

describe("_assertCounterfactualMatchesOnChain (drift guard)", () => {
  it("returns the off-chain address when the on-chain view agrees", async () => {
    const expected = await getCounterFactualAddress(client, UID, OWNER_KEY, SALT);
    onChainCounterfactual.mockResolvedValueOnce(expected);

    await expect(
      _assertCounterfactualMatchesOnChain(client, UID, OWNER_KEY, SALT),
    ).resolves.toBe(expected);
  });

  it("throws when the on-chain view disagrees (proxy bytecode drift)", async () => {
    onChainCounterfactual.mockResolvedValueOnce(
      "0x000000000000000000000000000000000000dead",
    );

    await expect(
      _assertCounterfactualMatchesOnChain(client, UID, OWNER_KEY, SALT),
    ).rejects.toThrow(/Counterfactual address mismatch/);
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

    // remaining bytes are abi.encode(WebAuthnSignature) - decode & assert field order
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

// The two ERC-1271 signers bind the wallet and the chain into the challenge, so
// every assertion below has to rebuild it rather than compare against the bare
// message digest. Mirrors Account4337.isValidSignature rather than calling the
// SDK's own helper, so a change to that helper fails here instead of agreeing
// with itself.
const SIGNER_CHAIN_ID = CHAIN_ID.BASE_SEPOLIA;
const SIGNER_ACCOUNT = "0x1111111111111111111111111111111111111111" as Address;

const erc1271Precursor = (validUntil: number, chainId: number, account: Address, messageHash: Hex): Hex =>
  encodePacked(
    ["uint8", "uint48", "uint256", "address", "bytes32"],
    [1, validUntil, BigInt(chainId), account, messageHash],
  );

// validUntil is a wall-clock value the signer picks, so read it back out of the
// envelope instead of trying to predict it.
const validUntilOf = (sig: Hex): number => hexToNumber(sliceHex(sig, 1, 7));

const challengeOf = (): Hex => {
  const req = passkeyGet.mock.calls[0][0];
  return toHex(isoBase64URL.toBuffer(req.challenge));
};

describe("_signMessage / _signUserOperationHash envelope shape", () => {
  beforeEach(() => {
    passkeyGet.mockReset();
    passkeyGet.mockResolvedValue(mockPasskeyResponse());
  });

  it("_signMessage produces a version-1 envelope with the stamped sig", async () => {
    const sig = await _signMessage("hello", "cred-id", "kokio.test", SIGNER_CHAIN_ID, SIGNER_ACCOUNT);
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

    // The user operation path stays three fields. The EntryPoint already folds
    // the chain id and the sender into userOpHash, so binding them again would
    // only make the precursor a different length from the contract's "39".
    const precursor = encodePacked(
      ["uint8", "uint48", "bytes32"],
      [1, validUntilOf(sig), userOpHash],
    );
    expect(size(precursor)).toBe(39);
    expect(challengeOf()).toBe(hashMessage({ raw: precursor }));
  });

  it("_signMessage binds version, validUntil, chain id and wallet into the challenge", async () => {
    const sig = await _signMessage("hello", "cred-id", "kokio.test", SIGNER_CHAIN_ID, SIGNER_ACCOUNT);

    const precursor = erc1271Precursor(
      validUntilOf(sig),
      SIGNER_CHAIN_ID,
      SIGNER_ACCOUNT,
      hashMessage("hello"),
    );
    // 1 + 6 + 32 + 20 + 32. The contract hardcodes "91" as the EIP-191 length
    // prefix, so a precursor of any other size hashes to a challenge it will
    // never rebuild.
    expect(size(precursor)).toBe(91);
    expect(challengeOf()).toBe(hashMessage({ raw: precursor }));
  });

  it("_signMessage does not stamp the bare message digest", async () => {
    await _signMessage("hello", "cred-id", "kokio.test", SIGNER_CHAIN_ID, SIGNER_ACCOUNT);
    expect(challengeOf()).not.toBe(hashMessage("hello"));
  });

  it("_signMessage produces a different challenge per chain", async () => {
    await _signMessage("hello", "cred-id", "kokio.test", SIGNER_CHAIN_ID, SIGNER_ACCOUNT);
    const onBaseSepolia = challengeOf();

    passkeyGet.mockClear();
    // Any chain id distinct from SIGNER_CHAIN_ID proves the challenge binds it.
    await _signMessage("hello", "cred-id", "kokio.test", 11155420, SIGNER_ACCOUNT);

    expect(challengeOf()).not.toBe(onBaseSepolia);
  });

  it("_signMessage produces a different challenge per wallet", async () => {
    await _signMessage("hello", "cred-id", "kokio.test", SIGNER_CHAIN_ID, SIGNER_ACCOUNT);
    const firstWallet = challengeOf();

    // Same owner key at another salt is a second wallet, so the address is the
    // only thing separating the two signatures.
    passkeyGet.mockClear();
    await _signMessage(
      "hello",
      "cred-id",
      "kokio.test",
      SIGNER_CHAIN_ID,
      "0x2222222222222222222222222222222222222222",
    );

    expect(challengeOf()).not.toBe(firstWallet);
  });

  it("_signMessage handles the { raw } SignableMessage form (pre-serialized bytes)", async () => {
    const raw = keccak256("0xbeef"); // a 32-byte pre-computed digest
    const sig = await _signMessage({ raw }, "cred-id", "kokio.test", SIGNER_CHAIN_ID, SIGNER_ACCOUNT);

    // hashMessage applies the EIP-191 prefix to the raw bytes; the old
    // `stringToBytes(message as string)` cast would have thrown / mangled this.
    const precursor = erc1271Precursor(
      validUntilOf(sig),
      SIGNER_CHAIN_ID,
      SIGNER_ACCOUNT,
      hashMessage({ raw }),
    );
    expect(challengeOf()).toBe(hashMessage({ raw: precursor }));
  });
});

describe("_signTypedData (P0: stub replaced with real passkey stamping)", () => {
  beforeEach(() => {
    passkeyGet.mockReset();
    passkeyGet.mockResolvedValue(mockPasskeyResponse());
  });

  const typedData: TypedDataDefinition = {
    domain: { name: "Kokio", version: "1", chainId: 11155111 },
    types: {
      Mail: [
        { name: "from", type: "address" },
        { name: "contents", type: "string" },
      ],
    },
    primaryType: "Mail",
    message: {
      from: "0x0000000000000000000000000000000000000001",
      contents: "gm",
    },
  };

  it("produces a non-zero WebAuthnSignature (proves the zero-filled stub is gone)", async () => {
    const sig = await _signTypedData(typedData, "cred-id", "kokio.test", SIGNER_CHAIN_ID, SIGNER_ACCOUNT);
    expect(sliceHex(sig, 0, 1)).toBe("0x01");

    const [decoded] = decodeAbiParameters(
      parseAbiParameters(
        "(bytes authenticatorData, string clientDataJSON, uint256 challengeIndex, uint256 typeIndex, uint256 r, uint256 s)",
      ),
      sliceHex(sig, 7),
    );
    const wa = decoded as WebAuthnSignature;
    expect(wa.r).toBe(RAW_R);
    expect(wa.s).toBe(5n);
    expect(wa.r).not.toBe(0n);
    expect(wa.clientDataJSON).toBe(CLIENT_DATA_JSON);
  });

  it("carries hashTypedData(typedData) as the message hash inside the challenge", async () => {
    const sig = await _signTypedData(typedData, "cred-id", "kokio.test", SIGNER_CHAIN_ID, SIGNER_ACCOUNT);

    const precursor = erc1271Precursor(
      validUntilOf(sig),
      SIGNER_CHAIN_ID,
      SIGNER_ACCOUNT,
      hashTypedData(typedData),
    );
    expect(size(precursor)).toBe(91);
    expect(challengeOf()).toBe(hashMessage({ raw: precursor }));
  });

  it("does not stamp the bare EIP-712 digest", async () => {
    await _signTypedData(typedData, "cred-id", "kokio.test", SIGNER_CHAIN_ID, SIGNER_ACCOUNT);
    expect(challengeOf()).not.toBe(hashTypedData(typedData));
  });

  // The typed data carries its own chainId, which is the app's domain and has
  // nothing to do with where the wallet lives.
  it("binds the wallet's chain, not the one in the EIP-712 domain", async () => {
    await _signTypedData(typedData, "cred-id", "kokio.test", SIGNER_CHAIN_ID, SIGNER_ACCOUNT);
    const onBaseSepolia = challengeOf();

    passkeyGet.mockClear();
    // Any chain id distinct from SIGNER_CHAIN_ID proves the challenge binds it.
    await _signTypedData(typedData, "cred-id", "kokio.test", 11155420, SIGNER_ACCOUNT);

    expect(challengeOf()).not.toBe(onBaseSepolia);
  });
});

describe("_encodeCalls", () => {
  const A = "0x00000000000000000000000000000000000000a1" as const;
  const B = "0x00000000000000000000000000000000000000b2" as const;

  it("routes a single call through execute", async () => {
    const encoded = await _encodeCalls([{ to: A, data: "0xdead" }]);
    expect(encoded).toBe(
      encodeFunctionData({
        abi: DeviceWallet,
        functionName: "execute",
        args: [{ dest: A, value: 0n, data: "0xdead" }],
      }),
    );
  });

  it("routes several calls through executeBatch", async () => {
    const encoded = await _encodeCalls([
      { to: A, data: "0xdead" },
      { to: B, data: "0xbeef", value: 7n },
    ]);
    expect(encoded).toBe(
      encodeFunctionData({
        abi: DeviceWallet,
        functionName: "executeBatch",
        args: [
          [
            { dest: A, value: 0n, data: "0xdead" },
            { dest: B, value: 7n, data: "0xbeef" },
          ],
        ],
      }),
    );
  });
});

describe("_getFactoryArgs", () => {
  it("splits the factory address from the createAccount calldata", async () => {
    const { factory, factoryData } = await _getFactoryArgs(client, UID, OWNER_KEY, SALT);

    expect(factory).toBe(baseSepoliaFactoryAddresses.DEVICE_WALLET_FACTORY);
    expect(factoryData).toBe(
      encodeFunctionData({
        abi: DeviceWalletFactory,
        functionName: "createAccount",
        args: [UID, OWNER_KEY, SALT],
      }),
    );
  });
});

describe("user operation hash on EntryPoint v0.8", () => {
  const userOperation = {
    sender: "0x00000000000000000000000000000000000acc71",
    nonce: 3n,
    callData: "0xdead",
    callGasLimit: 1n,
    verificationGasLimit: 2n,
    preVerificationGas: 3n,
    maxFeePerGas: 4n,
    maxPriorityFeePerGas: 5n,
    signature: "0x",
  } as const;

  const hashParams = {
    chainId: CHAIN_ID.BASE_SEPOLIA,
    entryPointAddress: baseSepoliaFactoryAddresses.ENTRY_POINT,
    userOperation,
  };

  // v0.8 domain-separates the digest, so a v0.7 signature never validates.
  it("differs from the v0.7 hash for the same operation", () => {
    const v8 = getUserOperationHash({ ...hashParams, entryPointVersion: "0.8" });
    const v7 = getUserOperationHash({ ...hashParams, entryPointVersion: "0.7" });

    expect(v8).not.toBe(v7);
  });

  it("is the EIP-712 digest over the ERC4337 domain", () => {
    const v8 = getUserOperationHash({ ...hashParams, entryPointVersion: "0.8" });
    const typedData = getUserOperationTypedData({
      chainId: CHAIN_ID.BASE_SEPOLIA,
      entryPointAddress: baseSepoliaFactoryAddresses.ENTRY_POINT,
      userOperation,
    });

    expect(typedData.domain).toMatchObject({
      name: "ERC4337",
      version: "1",
      chainId: CHAIN_ID.BASE_SEPOLIA,
      verifyingContract: baseSepoliaFactoryAddresses.ENTRY_POINT,
    });
    expect(v8).toBe(hashTypedData(typedData));
  });
});

// --- Gas estimate padding ----------------------------------------------------
// The bundler estimates against a stub signature that never reaches the P256
// verifier, so both verification numbers come back too low. The transport raises
// them before the operation that gets signed is built.
describe("_padGasEstimate", () => {
  it("raises verificationGasLimit and preVerificationGas by the measured shortfall", () => {
    const padded = _padGasEstimate({
      verificationGasLimit: toHex(100_000n),
      preVerificationGas: toHex(50_000n),
      callGasLimit: toHex(20_000n),
    });

    expect(BigInt(padded.verificationGasLimit)).toBe(100_000n + STUB_VERIFICATION_GAS_PAD);
    expect(BigInt(padded.preVerificationGas)).toBe(50_000n + STUB_PRE_VERIFICATION_GAS_PAD);
  });

  it("leaves every other field alone", () => {
    const padded = _padGasEstimate({
      verificationGasLimit: toHex(1n),
      preVerificationGas: toHex(1n),
      callGasLimit: toHex(20_000n),
      paymasterPostOpGasLimit: toHex(3_000n),
      paymasterVerificationGasLimit: toHex(4_000n),
    });

    expect(padded.callGasLimit).toBe(toHex(20_000n));
    expect(padded.paymasterPostOpGasLimit).toBe(toHex(3_000n));
    expect(padded.paymasterVerificationGasLimit).toBe(toHex(4_000n));
  });

  // A bundler that omits a field has not estimated it, and inventing a padded
  // zero would read as an estimate downstream.
  it("does not invent a field the bundler left out", () => {
    const padded = _padGasEstimate({ callGasLimit: toHex(20_000n) });

    expect("verificationGasLimit" in padded).toBe(false);
    expect("preVerificationGas" in padded).toBe(false);
  });

  // Covers the gap the padding exists to close: Base Sepolia measured 33,703 gas
  // estimated against a 76,628 floor, and 11,536 of missing calldata.
  it("covers the shortfall measured on Base Sepolia", () => {
    expect(STUB_VERIFICATION_GAS_PAD).toBeGreaterThanOrEqual(76_628n - 33_703n);
    expect(STUB_PRE_VERIFICATION_GAS_PAD).toBeGreaterThanOrEqual(11_536n);
  });
});
