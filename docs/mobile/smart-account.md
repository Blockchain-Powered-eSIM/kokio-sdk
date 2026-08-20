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
