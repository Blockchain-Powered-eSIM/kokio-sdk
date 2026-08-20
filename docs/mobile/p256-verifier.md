# P256 verifier

`kokio.P256Verifier`

Checks a WebAuthn (passkey) signature against a P256 public key directly,
without going through a wallet's `isValidSignature`. Present as soon as
`Kokio` has a `smartAccountClient`. A single-method surface, useful for
verifying a signature off chain before trusting it.

## verifySignature

Checks whether a WebAuthn assertion is a valid signature over a message, for
the given P256 public key.

```ts
const valid = await kokio.P256Verifier!.verifySignature(
  message,                    // the signed message, as hex
  true,                       // require the assertion to match the message
  webAuthnSignature,          // { authenticatorData, clientDataJSON, challengeIndex, typeIndex, r, s }
  x,                          // P256 public key x coordinate
  y,                          // P256 public key y coordinate
);
```

Returns: `Promise<boolean>`.
