# Utils

`admin.utils`

Checks what a mined transaction paid and how far its block has settled. Nothing is signed or sent. Both methods accept a transaction hash or a receipt, and all reads are sent together, so each check is one round trip.

A hash is the safer input when it comes from a user. A receipt is checked against the chain's block at its height, but its logs are used as given, so it is best taken from the backend's own node.

Prices are `bigint` cents, as in the contracts: `123456n` is \$1234.56.

```ts
const paid = await admin.utils.verifyProtocolPayment(txHash, "USDC", eSIMWalletAddress);
if (!paid.payments.some((p) => p.paymentReference === order.paymentReference)) return;

if (paid.finality === "finalized") issueESIM(order);
else markConfirming(order, paid.blockNumber, paid.blockHash); // checked again later
```

## Finality

A block on Base can be reorged out after it is mined, taking its payment with it. Both methods report how far the transaction's block has settled:

| `finality` | Meaning | Time behind the latest block on Base mainnet (measured) |
|---|---|---|
| `"latest"` | Mined, but can still be reorged out. | 0 |
| `"safe"` | Batch posted to L1. Only an L1 reorg can undo it. | about 1 minute |
| `"finalized"` | Batch finalized on L1. It cannot be undone. | about 19 minutes |

Anything that cannot be taken back, such as an eSIM, is best issued only on `"finalized"`. `"latest"` and `"safe"` are not errors. They can be used to show users that the payment is confirming. `blockNumber` and `blockHash` should be stored and checked again later for finality.

A receipt from a block that has since been reorged out throws `ReceiptNotCanonicalError`. Checking again by hash shows whether the payment is gone (`UnknownTransactionError`) or landed in a new block.

## verifyProtocolPayment

Lists every purchase an eSIM wallet paid for through the protocol in one currency, within one transaction. It works for `buyDataBundleWithToken` and `buyDataBundleWithTransfer`, including several purchases in one user operation and bundler transactions that carry other users' purchases.

The values come from the contracts' own events, the payment adapter's `PaymentSettled` and the eSIM wallet's `DataBundleBoughtWithToken`. Events from other contracts are ignored.

```ts
const result = await admin.utils.verifyProtocolPayment(
  txHash,             // or a receipt
  "USDCt",            // symbol as registered on the payment adapter, case-sensitive
  eSIMWalletAddress,  // the wallet that paid, not its device wallet
);
// { priceUSDCents: 500n, payments: [{ paymentReference, dataBundleId, priceUSDCents: 500n, amountSpent: 5000000n, vault }],
//   finality: "finalized", blockNumber, blockHash }
```

The symbol is converted to the `bytes32` the contracts expect (`"USDC"` becomes `0x5553444300…`). With no matching purchase, `priceUSDCents` is `0n` and `payments` is empty.

Errors:

- `InvalidAddressError`: malformed or zero address. `InvalidSymbolError`: empty symbol, or one over 32 bytes. Both are checked before any read.
- `UnknownTransactionError`: malformed hash, or no mined transaction yet.
- `TransactionRevertedError`: the transaction reverted.
- `ReceiptNotCanonicalError`: the receipt's block was reorged out.
- `NotAProtocolESIMWalletError`: the registry does not know the address as an eSIM wallet, for example when a device wallet is passed.
- `TokenNotAcceptedError`: `reason` is `"NOT_REGISTERED"` for a symbol the adapter never had (a typo or the wrong case), or `"NOT_ONCHAIN"` for one with no token, such as `USD`. A symbol withdrawn after the payment still verifies.
- `UnmatchedPaymentEventsError`: the two events do not pair up. The current contracts never produce this.

The payment adapter address comes from the SDK's configuration for the chain, so a move with `registry.setPaymentAdapter` needs an SDK update.

Returns: `Promise<ProtocolPaymentCheck>`, `{ priceUSDCents, payments, finality, blockNumber, blockHash }`. `priceUSDCents` is the total, and each payment is `{ paymentReference, dataBundleId, priceUSDCents, amountSpent, vault }`.

## verifyERC20Transfer

Adds up what one address sent another directly in any ERC-20, within one transaction. It suits tokens the protocol does not handle, or a single leg of a purchase, such as a device wallet funding its eSIM wallet.

```ts
const { priceUSDCents, amount, finality } = await admin.utils.verifyERC20Transfer(
  txHash,
  tokenAddress,
  senderAddress,
  destinationAddress,
);
```

Only `Transfer` events from the token itself, from `sender` to `destination`, are counted. Several transfers are added together, and amounts sent back are not subtracted. With none, both values are `0n`.

`priceUSDCents` treats one token as one dollar and rounds down, so `1_234_567n` of a 6-decimal token is `123n`. For tokens not worth a dollar, such as WETH, `amount` (in the token's smallest unit) is the meaningful value.

Errors:

- `InvalidAddressError`: malformed or zero address, or the same sender and destination.
- `UnknownTransactionError`, `TransactionRevertedError` and `ReceiptNotCanonicalError`, as above.
- `NotAnERC20TokenError`: the address does not answer `decimals()` and `totalSupply()`, such as an address with no code or an NFT contract. Network failures are passed on unchanged.
- `PriceOutOfRangeError`: the cents do not fit the contracts' `uint64`.

A token that moves balances without emitting `Transfer` reads as `0n`.

Returns: `Promise<ERC20TransferCheck>`, `{ priceUSDCents, amount, finality, blockNumber, blockHash }`.

## Fewer requests

Each check sends five reads at once. For RPC providers with request limits, a client created with `http(rpcUrl, { batch: true })` sends them as one HTTP request.
