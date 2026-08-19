# eSIM wallet

`admin.eSIMWallet`

The EOA-signed view of one eSIM wallet. Only present once bound with
`admin.setESIMWalletAddress(address)`.

```ts
admin.setESIMWalletAddress(eSIMWalletAddress);
const hash = await admin.eSIMWallet!.buyDataBundle({ dataBundleID, dataBundlePrice });
```

## buyDataBundle

Buys a data bundle for this eSIM as the admin, rather than as the eSIM's own
device wallet. Use this when the backend is paying for or triggering a
purchase on the user's behalf.

`value` is optional. Pass `0n` (the default) to have the contract pull the
price from the device wallet's own balance, or forward the price directly to
pay it from the admin EOA instead.

```ts
const hash = await admin.eSIMWallet!.buyDataBundle(
  { dataBundleID: "5gb-30d", dataBundlePrice: price },
  0n, // pull the price from the device wallet's balance
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

## dataBundlePriceCap

Reads the price ceiling stored on this wallet directly, in wei. Unlike the
mobile surface's `dataBundlePriceCap`, this does not fall back to the
registry's default when the wallet has none of its own, it returns whatever
this wallet's own storage holds.

```ts
const cap = await admin.eSIMWallet!.dataBundlePriceCap();
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

Returns: `Promise<DataBundleDetails>`, `{ dataBundleID, dataBundlePrice }`.
