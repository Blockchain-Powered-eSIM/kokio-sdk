# Payment adapter

`kokio.paymentAdapter`

Reads the currencies the protocol accepts for data bundle purchases. Present
as soon as `Kokio` has a `smartAccountClient`. A read-only surface: the
adapter's own writes are gated to the eSIM wallet mid-purchase or to the
registry, so nothing here sends a user operation. Registering or changing a
currency is an owner action, on `admin.protocolAdmin`.

```ts
const asset = "0x5553444300000000000000000000000000000000000000000000000000000000"; // "USDC" as bytes32
const amountIn = await kokio.paymentAdapter!.quote(asset, 500n); // priceUSDCents
```

## registry

Reads the registry this adapter reads `vault()` and eSIM wallet validity
from.

```ts
const registry = await kokio.paymentAdapter!.registry();
```

Returns: `Promise<Address>`.

## settlementToken

Reads the ERC-20 registered under the `USDC` symbol at configure time.

```ts
const usdc = await kokio.paymentAdapter!.settlementToken();
```

Returns: `Promise<Address>`.

## assets

Reads the raw currency table entry for a symbol. `decimals` reads `0` for a
symbol that was never registered, which is how `resolveAsset` tells "not
registered" apart from "registered but withdrawn" (`allowed: false`).

```ts
const asset = await kokio.paymentAdapter!.assets(symbol);
```

Returns: `Promise<Asset>`, `{ allowed, isDollarUnit, decimals, token }`.

## resolveAsset

Reads a currency's full entry, reverting if the symbol was never registered.
Worth checking before a purchase: `token` at the zero address means the
currency is fiat-only, and `buyDataBundleWithToken` reverts
`AssetNotTransferable` for it.

```ts
const asset = await kokio.paymentAdapter!.resolveAsset(symbol);
```

Returns: `Promise<Asset>`.

## quote

Reads the amount of `symbol`, in its smallest unit, that a `priceUSDCents`
charge currently costs. Read this before calling
`eSIMWallet.buyDataBundleWithToken`, and pass the result as `maxAmountIn`.
Nothing today moves the price between the quote and the purchase, so the two
always agree; a swap path may change that later, which is why the contract
takes a max rather than trusting the caller's figure outright.

```ts
const amountIn = await kokio.paymentAdapter!.quote(symbol, priceUSDCents);
```

Returns: `Promise<bigint>`.

## usedReferences

Checks whether a payment reference has already been spent here. Replay
protection now lives on `registry.usedPaymentReferences`, scoped per eSIM
wallet; this reads the adapter's own record from before that move.

```ts
const used = await kokio.paymentAdapter!.usedReferences(paymentReference);
```

Returns: `Promise<boolean>`.

## upgradeManager

Reads the address holding upgrade authority over this adapter (its owner).
On the live deployment this is the `ProtocolAdmin` timelock.

```ts
const manager = await kokio.paymentAdapter!.upgradeManager();
```

Returns: `Promise<Address>`.
