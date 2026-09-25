# Calls

`admin.calls`

Builds the calls a user's device wallet signs as one user operation. Nothing is signed or sent: the backend returns the calls to the app, and the app passes them to `deviceWallet.sendUserOperation`. Use this when a mobile SDK method batches several calls and the backend wants to keep that logic on its side.

Every method takes the target address as an argument, so one `KokioAdmin` builds calls for any user without `setESIMWalletAddress`.

```ts
import { Settlement } from "kokio-sdk/types";

// Backend, in the "buy" endpoint
const calls = await admin.calls.buyDataBundleWithTransfer(
  eSIMWalletAddress,
  { id: bundleId, priceUSDCents: 500n, settlement: Settlement.DeviceWallet },
  asset,
  maxAmountIn,
  paymentReference,
);
return calls; // plain { to, data } strings, safe to send as JSON

// App
const userOpHash = await kokio.deviceWallet!.sendUserOperation(calls);
```

## buyDataBundleWithTransfer

Builds the same calls as `kokio.eSIMWallet.buyDataBundleWithTransfer`: an ERC-20 `transfer` from the device wallet for whatever the eSIM wallet is short of the quote, then `buyDataBundleWithToken`. When the eSIM wallet already holds enough, only the purchase is returned. Arguments after the address are the same as `buyDataBundleWithToken`.

```ts
const asset = "0x5553444300000000000000000000000000000000000000000000000000000000"; // "USDC" as bytes32
const maxAmountIn = await admin.paymentAdapter.quote(asset, 500n);

const calls = await admin.calls.buyDataBundleWithTransfer(
  eSIMWalletAddress,
  { id: bundleId, priceUSDCents: 500n, settlement: Settlement.DeviceWallet },
  asset,
  maxAmountIn,
  paymentReference,
);
```

The shortfall is worked out from the eSIM wallet's balance and the quote when the calls are built. If either changes before the user signs, the operation reverts. On a retry, build the calls again with the same `paymentReference` instead of resending the old ones.

The purchase emits `DataBundleBoughtWithToken` on the eSIM wallet, the same event as a plain `buyDataBundleWithToken`, so a webhook filtering on that event and `_paymentReference` needs no change.

Returns: `Promise<Call[]>`, one or two `{ to, data }` entries.
