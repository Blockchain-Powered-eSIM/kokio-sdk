# eSIM wallet

`admin.eSIMWallet`

The EOA-signed view of one eSIM wallet. Only present once bound with
`admin.setESIMWalletAddress(address)`.

```ts
admin.setESIMWalletAddress(eSIMWalletAddress);
const asset = "0x5553444300000000000000000000000000000000000000000000000000000000"; // "USDC" as bytes32
const maxAmountIn = await admin.paymentAdapter.quote(asset, 500n);
const hash = await admin.eSIMWallet!.buyDataBundleWithToken(
  { id: bundleId, priceUSDCents: 500n, settlement: 0 },
  asset,
  maxAmountIn,
  paymentReference,
);
```

## buyDataBundleWithToken

Buys a data bundle for this eSIM as the admin, rather than as the eSIM's own
device wallet. Use this when the backend is triggering a purchase on the
user's behalf and the device wallet's own token balance pays for it.

Read `admin.paymentAdapter.quote(asset, priceUSDCents)` first to size
`maxAmountIn`, the most of `asset` this purchase may spend, in its smallest
unit. `paymentReference` is a backend-issued id, spendable once per eSIM
wallet.

```ts
const hash = await admin.eSIMWallet!.buyDataBundleWithToken(
  { id: bundleId, priceUSDCents: 500n, settlement: 0 }, // 0 = DeviceWallet pays
  asset,
  maxAmountIn,
  paymentReference,
);
```

Returns: `Promise<Hash>`.

## eSIMWalletFactory

Reads the address of the factory that deployed this eSIM wallet.

```ts
const factory = await admin.eSIMWallet!.eSIMWalletFactory();
```

Returns: `Promise<Address>`.

## eSIMUniqueIdentifier

Reads the eSIM identifier this wallet was created for.

```ts
const id = await admin.eSIMWallet!.eSIMUniqueIdentifier();
```

Returns: `Promise<string>`.

## newRequestedOwner

Reads the device wallet named in a pending ownership transfer, if any.

```ts
const pending = await admin.eSIMWallet!.newRequestedOwner();
```

Returns: `Promise<Address>`.

## owner

Reads the device wallet that currently owns this eSIM wallet.

```ts
const owner = await admin.eSIMWallet!.owner();
```

Returns: `Promise<Address>`.

## priceCapUSDCents

Reads the price ceiling stored on this wallet directly, in USD cents. Unlike
the mobile surface's `priceCapUSDCents`, this does not fall back to the
registry's default when the wallet has none of its own, it returns whatever
this wallet's own storage holds.

```ts
const cap = await admin.eSIMWallet!.priceCapUSDCents();
```

Returns: `Promise<bigint>`.

## deviceWallet

Reads the device wallet this eSIM wallet belongs to.

```ts
const deviceWallet = await admin.eSIMWallet!.deviceWallet();
```

Returns: `Promise<Address>`.

## transactionHistory

Reads one past purchase by its position in the list.

```ts
const purchase = await admin.eSIMWallet!.transactionHistory(0n);
```

Returns: `Promise<DataBundleDetails>`, `{ id, priceUSDCents, settlement }`.
`settlement` names which contract, if any, saw the money move: `0` for the
device wallet's own balance, `1` for an external wallet, `2` for fiat. Only
`0` is provable onchain.
