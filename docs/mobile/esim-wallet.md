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
const asset = "0x5553444300000000000000000000000000000000000000000000000000000000"; // "USDC" as bytes32
const dataBundleDetails = { id: bundleId, priceUSDCents: 500n, settlement: Settlement.DeviceWallet };
const maxAmountIn = await kokio.paymentAdapter!.quote(asset, dataBundleDetails.priceUSDCents);
const hash = await kokio.eSIMWallet!.buyDataBundleWithToken(dataBundleDetails, asset, maxAmountIn, paymentReference);
```

## buyDataBundleWithToken

Buys a data bundle for this eSIM, paid for in an ERC-20 the payment adapter
accepts (USDC on Base Sepolia today). Use this for the everyday purchase
flow.

Check `priceCapUSDCents()` first: a price above the cap reverts. Read
`kokio.paymentAdapter!.quote(asset, priceUSDCents)` to size `maxAmountIn` -
the most of `asset` this purchase may spend, in its smallest unit. Nothing
moves the price between the quote and the purchase today, so quoting and
passing that value straight through is enough; a swap path may show up later,
which is why the contract takes a max rather than an exact amount.

`paymentReference` ties the purchase to its offchain order and is spendable
once per eSIM wallet. The backend hands this to the app; the SDK never
invents one.

```ts
const hash = await kokio.eSIMWallet!.buyDataBundleWithToken(
  {
    id: bundleId, // bytes32
    priceUSDCents: 500n, // $5.00, must not exceed priceCapUSDCents()
    settlement: Settlement.DeviceWallet, // this wallet's own balance pays
  },
  asset, // bytes32 symbol, e.g. "USDC"
  maxAmountIn, // from paymentAdapter.quote(asset, priceUSDCents)
  paymentReference, // bytes32, from the backend
);
```

Returns: `Promise<Hash>`, a user operation hash.

## sendTokenToDeviceWallet

Sends an ERC-20 held by this eSIM wallet back to its owning device wallet.
Nothing else moves a stray token balance off this wallet, so use this when one
is stuck here after a handover or a refund.

```ts
const hash = await kokio.eSIMWallet!.sendTokenToDeviceWallet(tokenAddress, amount);
```

Returns: `Promise<Hash>`.

## setPriceCapUSDCents

Sets the most this eSIM wallet may be charged for one bundle, in USD cents.
Use it to give the user control over their own spending limit, separate from
whatever the admin sets as the default.

Pass `0n` to hand control back to the registry's default cap.

```ts
const hash = await kokio.eSIMWallet!.setPriceCapUSDCents(50_000n); // $500.00
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

Sends ETH held by this eSIM wallet back to its owning device wallet. Data
bundles no longer cost ETH, but the wallet still accepts plain ETH transfers
(that is how a device wallet tops it up), so this stays around for moving
that balance back.

```ts
const hash = await kokio.eSIMWallet!.sendETHToDeviceWallet(amount);
```

Returns: `Promise<Hash>`.

## priceCapUSDCents

Reads the price ceiling that actually applies to this wallet's next
purchase, in USD cents. Check this before naming a price on
`buyDataBundleWithToken`.

If the wallet has no cap of its own it falls back to the registry's default,
and if neither is set it returns the maximum `uint64` rather than zero, so a
missing cap never reads as "no purchases allowed."

```ts
const cap = await kokio.eSIMWallet!.priceCapUSDCents();
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

Returns: `Promise<DataBundleDetails>`, `{ id, priceUSDCents, settlement }`.
`settlement` names which contract, if any, saw the money move: `0` for this
wallet's own balance, `1` for an external wallet, `2` for fiat. Only `0` is
provable onchain; the admin's word is the only check on the other two.
