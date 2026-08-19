# Device wallet

`admin.deviceWallet`

The EOA-signed view of one device wallet. Only present once bound with
`admin.setDeviceWalletAddress(address)`. Writes here send an ordinary
transaction from the admin EOA, no bundler or passkey involved.

```ts
admin.setDeviceWalletAddress(deviceWalletAddress);
const hash = await admin.deviceWallet!.deployESIMWallet(salt);
```

## deployESIMWallet

Deploys a new eSIM wallet under this device wallet. Use it for the backend's
normal onboarding flow: deploy the device wallet, then deploy its first eSIM
wallet.

This is the only path to `DeviceWallet.deployESIMWallet`; it needs the admin
EOA and cannot be reached from a device-wallet user operation.

```ts
const hash = await admin.deviceWallet!.deployESIMWallet(salt);
```

Returns: `Promise<Hash>`.

## addDeposit

Tops up this device wallet's gas deposit at the EntryPoint, paid from the
admin EOA's own balance. Open to anyone, paying into another account's
deposit only costs the payer.

```ts
const hash = await admin.deviceWallet!.addDeposit(amount);
```

Returns: `Promise<Hash>`.

## deviceUniqueIdentifier

Reads the device identifier this wallet was deployed for.

```ts
const id = await admin.deviceWallet!.deviceUniqueIdentifier();
```

Returns: `Promise<string>`.

## isValidESIMWallet

Checks whether this device wallet currently holds a given eSIM wallet.

```ts
const holds = await admin.deviceWallet!.isValidESIMWallet(eSIMWalletAddress);
```

Returns: `Promise<boolean>`.

## canPullETH

Checks whether an eSIM wallet is currently allowed to pull ETH from this
device wallet.

```ts
const allowed = await admin.deviceWallet!.canPullETH(eSIMWalletAddress);
```

Returns: `Promise<boolean>`.

## getVaultAddress

Reads the protocol vault address this wallet's fees flow to.

```ts
const vault = await admin.deviceWallet!.getVaultAddress();
```

Returns: `Promise<Address>`.

## getOwner

Reads the P256 public key that currently owns this wallet.

```ts
const ownerKey = await admin.deviceWallet!.getOwner();
```

Returns: `Promise<P256Key>`, an `[x, y]` hex pair.

## getDeposit

Reads the gas balance this wallet currently holds at the EntryPoint.

```ts
const deposit = await admin.deviceWallet!.getDeposit();
```

Returns: `Promise<bigint>`.

## isValidSignature

Checks a signature over an arbitrary message, following ERC-1271.

```ts
const result = await admin.deviceWallet!.isValidSignature(messageHash, signature);
```

Returns: `Promise<Hex>`, `0x1626ba7e` when the signature is valid and has not
expired, `0xffffffff` otherwise.

## registry

Reads the address of the registry this wallet reports ownership changes to.

```ts
const registry = await admin.deviceWallet!.registry();
```

Returns: `Promise<Address>`.

## eSIMWalletFactory

Reads the address of the factory that deploys this wallet's eSIM wallets.

```ts
const factory = await admin.deviceWallet!.eSIMWalletFactory();
```

Returns: `Promise<Address>`.

## entryPoint

Reads the ERC-4337 EntryPoint address this wallet answers to.

```ts
const entryPoint = await admin.deviceWallet!.entryPoint();
```

Returns: `Promise<Address>`.

## verifier

Reads the P256 verifier contract this wallet falls back to when the chain has
no RIP-7212 precompile for signature checks.

```ts
const verifier = await admin.deviceWallet!.verifier();
```

Returns: `Promise<Address>`.
