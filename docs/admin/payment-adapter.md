# Payment adapter

`admin.paymentAdapter`

Reads and manages the currencies the protocol accepts for data bundle
purchases. Available as soon as `KokioAdmin` exists. `registerAsset` and
`updateAsset` are owner only; on the live deployment the owner is the
`protocolAdmin` timelock, so use the `*Call` builders below with
`admin.protocolAdmin.proposer.schedule` rather than calling them directly.

```ts
const asset = "0x5553444300000000000000000000000000000000000000000000000000000000"; // "USDC" as bytes32
const amountIn = await admin.paymentAdapter.quote(asset, 500n); // priceUSDCents
```

## registerAsset

Adds a currency the adapter has never seen. Reverts if the symbol is already
registered; use `updateAsset` to change one that exists.

```ts
const hash = await admin.paymentAdapter.registerAsset(symbol, {
  allowed: true,
  isDollarUnit: true, // USDC, USDT, DAI and USD are true; ETH, TON and ZEC are not
  decimals: 6,
  token: usdcAddress, // zero address for a fiat-only currency
});
```

Returns: `Promise<Hash>`.

## updateAsset

Changes a currency already in the table: its decimals, token address, or
whether it is currently allowed.

```ts
const hash = await admin.paymentAdapter.updateAsset(symbol, updatedAsset);
```

Returns: `Promise<Hash>`.

## acceptOwnership

Accepts a pending ownership transfer. Call this from the account named as
`pendingOwner`.

```ts
const hash = await admin.paymentAdapter.acceptOwnership();
```

Returns: `Promise<Hash>`.

## registerAssetCall

Builds the call payload to add a currency, for scheduling through the
timelock.

```ts
const call = await admin.paymentAdapter.registerAssetCall(symbol, asset);
const scheduled = await admin.protocolAdmin.proposer.schedule(call);
```

Returns: `Promise<OwnerCall>`.

## updateAssetCall

Builds the call payload to change a currency already in the table.

```ts
const call = await admin.paymentAdapter.updateAssetCall(symbol, asset);
const scheduled = await admin.protocolAdmin.proposer.schedule(call);
```

Returns: `Promise<OwnerCall>`.

## transferOwnershipCall

Builds the call payload to hand ownership of this contract to a new address.
On the live deployment the owner is the `protocolAdmin` timelock, so hand
the result to `protocolAdmin.proposer.schedule` rather than sending it
directly.

```ts
const call = await admin.paymentAdapter.transferOwnershipCall(newOwner);
const scheduled = await admin.protocolAdmin.proposer.schedule(call);
```

Returns: `Promise<OwnerCall>`.

## upgradeCall

Builds the call payload to point this contract's proxy at a new
implementation. Hand the result to `protocolAdmin.proposer.schedule`.

There is no undo. Check the new implementation's storage layout matches
before scheduling.

```ts
const call = await admin.paymentAdapter.upgradeCall(newImplementation);
const scheduled = await admin.protocolAdmin.proposer.schedule(call);
```

Returns: `Promise<OwnerCall>`.

## registry

Reads the registry this adapter reads `vault()` and eSIM wallet validity
from.

```ts
const registry = await admin.paymentAdapter.registry();
```

Returns: `Promise<Address>`.

## settlementToken

Reads the ERC-20 registered under the `USDC` symbol at configure time.

```ts
const usdc = await admin.paymentAdapter.settlementToken();
```

Returns: `Promise<Address>`.

## assets

Reads the raw currency table entry for a symbol. `decimals` reads `0` for a
symbol that was never registered, which is how `resolveAsset` tells "not
registered" apart from "registered but withdrawn" (`allowed: false`).

```ts
const asset = await admin.paymentAdapter.assets(symbol);
```

Returns: `Promise<Asset>`, `{ allowed, isDollarUnit, decimals, token }`.

## resolveAsset

Reads a currency's full entry, reverting if the symbol was never registered.

```ts
const asset = await admin.paymentAdapter.resolveAsset(symbol);
```

Returns: `Promise<Asset>`.

## quote

Reads the amount of `symbol`, in its smallest unit, that a `priceUSDCents`
charge currently costs. Worth reading before `registry.recordSettledPurchase`,
to size `tokenAmount` for the backend's own settlement record.

```ts
const amountIn = await admin.paymentAdapter.quote(symbol, priceUSDCents);
```

Returns: `Promise<bigint>`.

## usedReferences

Checks whether a payment reference has already been spent here. Replay
protection now lives on `registry.usedPaymentReferences`, scoped per eSIM
wallet; this reads the adapter's own record from before that move.

```ts
const used = await admin.paymentAdapter.usedReferences(paymentReference);
```

Returns: `Promise<boolean>`.

## upgradeManager

Reads the address holding upgrade authority over this adapter (its owner).
On the live deployment this is the `ProtocolAdmin` timelock.

```ts
const manager = await admin.paymentAdapter.upgradeManager();
```

Returns: `Promise<Address>`.
