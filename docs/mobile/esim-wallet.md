# eSIM wallet

`kokio.eSIMWallet`

Wraps one eSIM wallet, the contract that holds a single eSIM's purchase
history and price cap. Only present once `Kokio` has both a
`smartAccountClient` and an `eSIMWalletAddress`, set on the constructor or
bound afterwards with `kokio.setESIMWalletAddress(address)` - the way to
switch which eSIM wallet a user with several of them is currently acting on.
Writes here need the device wallet that owns this eSIM wallet to be the
signer, which is exactly what a passkey user operation already is.

```ts
const hash = await kokio.eSIMWallet!.buyDataBundle({ dataBundleID, dataBundlePrice });
```

## buyDataBundle

Buys a data bundle for this eSIM. Use this for the everyday purchase flow.

Check `dataBundlePriceCap()` first: a price above the cap reverts.

```ts
const hash = await kokio.eSIMWallet!.buyDataBundle({
  dataBundleID: "5gb-30d",
  dataBundlePrice: price, // must not exceed dataBundlePriceCap()
});
```

Returns: `Promise<Hash>`, a user operation hash.

## setDataBundlePriceCap

Sets the most this eSIM wallet may be charged for one bundle. Use it to give
the user control over their own spending limit, separate from whatever the
admin sets as the default.

Pass `0n` to hand control back to the registry's default cap.

```ts
const hash = await kokio.eSIMWallet!.setDataBundlePriceCap(cap);
```

Returns: `Promise<Hash>`.

## requestTransferOwnership

Starts moving this eSIM wallet to a new device wallet. Use it when a user is
switching their eSIM to a different device. The move only completes once the
new device wallet calls `acceptOwnershipTransfer`.

```ts
const hash = await kokio.eSIMWallet!.requestTransferOwnership(newDeviceWalletAddress);
```

Returns: `Promise<Hash>`.

## acceptOwnershipTransfer

Finishes a transfer that another device wallet started. Call this from the
device wallet that was named in `requestTransferOwnership`.

```ts
const hash = await kokio.eSIMWallet!.acceptOwnershipTransfer();
```

Returns: `Promise<Hash>`.

## sendETHToDeviceWallet

Sends ETH held by this eSIM wallet back to its owning device wallet.

```ts
const hash = await kokio.eSIMWallet!.sendETHToDeviceWallet(amount);
```

Returns: `Promise<Hash>`.

## dataBundlePriceCap

Reads the price ceiling that actually applies to this wallet's next
purchase, in wei. Check this before naming a price on `buyDataBundle`.

If the wallet has no cap of its own it falls back to the registry's default,
and if neither is set it returns the maximum `uint256` rather than zero, so a
missing cap never reads as "no purchases allowed."

```ts
const cap = await kokio.eSIMWallet!.dataBundlePriceCap();
```

Returns: `Promise<bigint>`.

## owner

Reads the device wallet that currently owns this eSIM wallet.

```ts
const owner = await kokio.eSIMWallet!.owner();
```

Returns: `Promise<Address>`.

## deviceWallet

Reads the device wallet this eSIM wallet belongs to. Tracks the same value
as `owner`, but through its own contract slot.

```ts
const deviceWallet = await kokio.eSIMWallet!.deviceWallet();
```

Returns: `Promise<Address>`.

## transactionHistory

Reads one past purchase by its position in the list. There is no length
getter, so read upward from `0n` until a call reverts, or track the count
from the wallet's purchase events.

```ts
const purchase = await kokio.eSIMWallet!.transactionHistory(0n);
```

Returns: `Promise<DataBundleDetails>`, `{ dataBundleID, dataBundlePrice }`.
