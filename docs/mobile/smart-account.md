# Smart account

`kokio.smartAccount`

Resolves a device's passkey to its smart account, and builds the client that
sends user operations for it. Run these two in order: the account from the
first feeds the client in the second.

```ts
const account = await kokio.smartAccount.getSmartWallet(deviceUniqueIdentifier, ownerKey, salt);
const smartAccountClient = await kokio.smartAccount.getSmartWalletClient(account);
```

## getSmartWallet

Works out the device wallet's address for a given passkey, without touching
the chain. Call this once per session, right after constructing `Kokio`, to
get the account object every other write needs.

The address is counterfactual: it is computed the same way the contract would
compute it, so it is valid before the wallet is deployed. The first call on a
chain also checks that computation against the real factory, so a mismatch
fails loudly instead of sending a user operation to the wrong address.

```ts
const account = await kokio.smartAccount.getSmartWallet(
  deviceUniqueIdentifier, // string id for this device
  ownerKey,               // the passkey's P256 public key, as [x, y] hex
  salt,                   // bigint, makes the address unique per user
);
```

Returns: `KokioSmartAccount`, a viem smart account object. Pass it to
`getSmartWalletClient`.

The wallet client given to `Kokio` does not need an `account`. The passkey signs, so a client with just a chain and transport is enough.

## getSmartWalletClient

Builds the client that signs with the passkey and sends user operations
through Pimlico's bundler and paymaster. Every write on the other mobile
surfaces needs this client, so build it once and reuse it.

```ts
const smartAccountClient = await kokio.smartAccount.getSmartWalletClient(account);
```

Returns: `KokioSmartAccountClient`, a bundler client that can also read
contracts directly (it carries viem's public actions too). Pass it as
`smartAccountClient` to a new `Kokio(...)` call so the contract surfaces
(`deviceWallet`, `eSIMWallet`, and the rest) become available.

Gas is sponsored by the paymaster at the same endpoint. The gas policy id given to `Kokio` is optional. Pass `""` to send no policy, or a Pimlico sponsorship policy id to have that policy's rules applied.

To send user operations somewhere other than Pimlico, such as a local bundler in tests, pass `bundlerUrl`. That endpoint must also answer the ERC-7677 paymaster methods.

```ts
const smartAccountClient = await kokio.smartAccount.getSmartWalletClient(account, {
  bundlerUrl: "http://127.0.0.1:4337",
});
```

If a user operation would revert, sending it throws `ContractRevertError` with the contract's error name in `decoded.errorName`, and nothing is sent.
