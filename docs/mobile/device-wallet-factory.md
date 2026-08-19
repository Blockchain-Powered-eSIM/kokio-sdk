# Device wallet factory

`kokio.deviceWalletFactory`

Read-only lookups against the factory that deploys device wallets, plus one
EOA-signed deploy method. Present as soon as `Kokio` has a
`smartAccountClient`, no device wallet address needed since this surface is
chain-wide, not tied to one wallet.

```ts
const address = await kokio.deviceWalletFactory!.getAddress(deviceUniqueIdentifier, ownerKey, salt);
```

## createAccountWithEOA

Deploys a device wallet directly from an EOA, instead of through the smart
account flow. This needs the `walletClient` passed to `Kokio` to carry a
signing account (`walletClient.account` set), which the mobile quick start's
`createWalletClient` does not do by default. Most mobile apps deploy through
the backend's `admin.deviceWalletFactory.createAccount` instead; use this
method only if the app itself holds a funded EOA.

```ts
const hash = await kokio.deviceWalletFactory!.createAccountWithEOA(
  deviceUniqueIdentifier,
  ownerKey,
  salt,
  depositAmount,
);
```

Returns: `Promise<Hash>`, a transaction hash (not a user operation, this is a
direct EOA transaction).

## getAddress

Works out the address a device wallet will deploy to for a given identifier,
owner key, and salt, without sending anything. Same computation
`kokio.smartAccount.getSmartWallet` uses internally.

```ts
const address = await kokio.deviceWalletFactory!.getAddress(deviceUniqueIdentifier, ownerKey, salt);
```

Returns: `Promise<Address>`.

## preCreateAccountValidation

Checks whether a device identifier or owner key is already taken, before
deploying. Call this before any deploy: once a user operation reaches the
chain, the factory cannot see the registry from inside EntryPoint validation,
so a taken identifier deploys a second, orphaned wallet instead of failing
cleanly.

```ts
const holder = await kokio.deviceWalletFactory!.preCreateAccountValidation(deviceUniqueIdentifier, ownerKey);
```

Returns: `Promise<Address>`, the zero address when both are free, or the
wallet already holding one of them.

## deviceWalletInfoAdded

Checks whether the factory has finished registering a device wallet. This
flips to `true` only after the backend calls `postCreateAccount`, so a wallet
the app just deployed reads `false` until the backend catches up.

```ts
const registered = await kokio.deviceWalletFactory!.deviceWalletInfoAdded(deviceWalletAddress);
```

Returns: `Promise<boolean>`.

## getCurrentDeviceWalletImplementation

Reads the device wallet implementation contract every new wallet points at.

```ts
const impl = await kokio.deviceWalletFactory!.getCurrentDeviceWalletImplementation();
```

Returns: `Promise<Address>`.

## beacon

Reads the beacon every device wallet reads its implementation from. One
beacon update moves every existing device wallet at once.

```ts
const beacon = await kokio.deviceWalletFactory!.beacon();
```

Returns: `Promise<Address>`.

## registry

Reads the registry address the factory writes newly deployed wallets into.

```ts
const registry = await kokio.deviceWalletFactory!.registry();
```

Returns: `Promise<Address>`.

## entryPoint

Reads the ERC-4337 EntryPoint address baked into every wallet this factory
deploys.

```ts
const entryPoint = await kokio.deviceWalletFactory!.entryPoint();
```

Returns: `Promise<Address>`.

## verifier

Reads the P256 verifier contract new device wallets use to check WebAuthn
signatures.

```ts
const verifier = await kokio.deviceWalletFactory!.verifier();
```

Returns: `Promise<Address>`.
