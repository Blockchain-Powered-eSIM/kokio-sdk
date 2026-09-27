# Utils

`admin.utils`

Checks what a mined transaction actually paid, and how far its block has settled, before the backend acts on it. Nothing is signed or sent. Both methods take a transaction hash or a receipt, and every read they need goes out at once, so a check costs one round trip to the node.

Pass the hash when it came from a user. A receipt passed in is checked against the chain's block at its height, but its logs are used as given, so only pass one your own node returned.

Prices come back as `bigint` cents, the same format the contracts use: `123456n` is \$1234.56.

```ts
// Backend, when the app reports a purchase
const paid = await admin.utils.verifyProtocolPayment(txHash, "USDC", eSIMWalletAddress);
if (!paid.payments.some((p) => p.paymentReference === order.paymentReference)) return;

if (paid.finality === "finalized") issueESIM(order);
else markConfirming(order, paid.blockNumber, paid.blockHash); // check again later
```

## Finality

Base can drop a block it has already shown you, and a payment in that block is gone with it. Both methods say how far the transaction's block has settled:

| `finality` | Meaning | Behind the latest block on Base mainnet, measured |
|---|---|---|
| `"latest"` | Mined, but can still be reorged out. | 0 |
| `"safe"` | Its batch is posted to L1. Only an L1 reorg can undo it. | about 1 minute |
| `"finalized"` | L1 has finalized the batch. It cannot be undone. | about 19 minutes |

Issue anything you cannot take back, such as an eSIM, only on `"finalized"`. A check that answers `"latest"` or `"safe"` is not an error: show the user the payment is confirming, keep `blockNumber` and `blockHash`, and check again later. Both come back with every result.

Waiting for more blocks is not the same thing on an L2. The node's `safe` and `finalized` tags are what count, and both are read alongside the receipt.

A receipt passed in from a block that has since been reorged out throws `ReceiptNotCanonicalError`. Check again by hash: the payment is either gone (`UnknownTransactionError`) or in a new block.

## verifyProtocolPayment

Lists every purchase an eSIM wallet paid for through the protocol in one currency, within one transaction. Use it after `buyDataBundleWithToken` or `buyDataBundleWithTransfer`, including a user operation that bought several bundles, or a bundler transaction that also carries other users' purchases.

The price, amount and reference come from the contracts' own events: the payment adapter's `PaymentSettled` and the eSIM wallet's `DataBundleBoughtWithToken`. Events from any other contract are ignored.

```ts
const result = await admin.utils.verifyProtocolPayment(
  txHash,             // or the receipt your node returned
  "USDCt",            // symbol as registered on the payment adapter, case-sensitive
  eSIMWalletAddress,  // the wallet that paid, not its device wallet
);
// { priceUSDCents: 500n, payments: [{ paymentReference, dataBundleId, priceUSDCents: 500n, amountSpent: 5000000n, vault }],
//   finality: "finalized", blockNumber, blockHash }
```

The symbol is turned into the `bytes32` the contracts take (`"USDC"` becomes `0x5553444300…`), so pass it as text. A transaction with no matching purchase answers `priceUSDCents: 0n` and `payments: []`.

It throws:

- `InvalidAddressError` for a malformed or zero address, and `InvalidSymbolError` for an empty symbol or one over 32 bytes. Both are checked before anything is read.
- `UnknownTransactionError` for a malformed hash, or one with no mined transaction yet. Nothing waits for it.
- `TransactionRevertedError` if the transaction reverted.
- `ReceiptNotCanonicalError` for a receipt passed in from a block since reorged out. See [Finality](#finality).
- `NotAProtocolESIMWalletError` if the registry does not know the address as an eSIM wallet. Passing the device wallet lands here.
- `TokenNotAcceptedError` with `reason: "NOT_REGISTERED"` for a symbol the adapter never had (a typo, or the wrong case), and `"NOT_ONCHAIN"` for one with no token, such as `USD`. A symbol withdrawn after the payment still verifies, since the contract accepted it at the time.
- `UnmatchedPaymentEventsError` if the two events do not pair up, which the current contracts never produce.

It reads the payment adapter at the address the SDK has for the chain. After `registry.setPaymentAdapter` moves it, update the SDK.

Returns: `Promise<ProtocolPaymentCheck>`, `{ priceUSDCents, payments, finality, blockNumber, blockHash }`, with `priceUSDCents` the total and each payment `{ paymentReference, dataBundleId, priceUSDCents, amountSpent, vault }`.

## verifyERC20Transfer

Adds up what one address sent another directly in any ERC-20, within one transaction. Use it for a token the protocol does not handle, or to check a single leg of a purchase, such as the device wallet funding its eSIM wallet in `buyDataBundleWithTransfer`.

```ts
const { priceUSDCents, amount, finality } = await admin.utils.verifyERC20Transfer(
  txHash,
  tokenAddress,
  senderAddress,
  destinationAddress,
);
```

Only `Transfer` events emitted by the token itself count, and only from `sender` to `destination`. Several transfers are added together, and anything sent back is not subtracted. A transaction with none answers `priceUSDCents: 0n` and `amount: 0n`.

`priceUSDCents` counts one token as one dollar, the way the payment adapter prices a dollar currency, and rounds down: `1_234_567n` of a 6-decimal token is `123n`. For a token that is not worth a dollar, such as WETH, ignore it and use `amount`, which is in the token's smallest unit.

It throws:

- `InvalidAddressError` for a malformed or zero address, or a sender that is also the destination.
- `UnknownTransactionError`, `TransactionRevertedError` and `ReceiptNotCanonicalError`, as above.
- `NotAnERC20TokenError` if the address does not answer `decimals()` and `totalSupply()`. That covers an address with no code and an NFT contract. A network failure is passed on as-is instead.
- `PriceOutOfRangeError` if the cents do not fit the contracts' `uint64`.

A token that moves balances without emitting `Transfer` reads as `0n`, since there is nothing in the receipt to find.

Returns: `Promise<ERC20TransferCheck>`, `{ priceUSDCents, amount, finality, blockNumber, blockHash }`.

## Fewer requests

Each check sends five reads at the same moment. If your RPC provider limits requests per second, create the client with `http(rpcUrl, { batch: true })` and viem sends them as one HTTP request.
