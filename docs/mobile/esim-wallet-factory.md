# eSIM wallet factory

`kokio.eSIMWalletFactory`

Predicts and deploys eSIM wallets for a device wallet. Present as soon as `Kokio` has
a `smartAccountClient`, chain-wide like the device wallet factory.

To deploy a new eSIM wallet, use [`deviceWallet.deployAndBindESIMWallet`](device-wallet.md#deployandbindesimwallet). It deploys and binds in one user operation and returns the new address.

## getCounterFactualAddress

Works out the address an eSIM wallet will have for a device wallet and salt, before it is deployed. A plain read, no user operation.

```ts
const eSIMWalletAddress = await kokio.eSIMWalletFactory!.getCounterFactualAddress(deviceWalletAddress, 1n);
```

Returns: `Promise<Address>`.

## deployESIMWalletWithUserOp

**Deprecated.** Use `deviceWallet.deployAndBindESIMWallet`. This deploys the eSIM wallet without adding it to the device wallet's list, so the device wallet does not treat it as its own until `addESIMWallet` runs.

Deploys a new eSIM wallet, owned by the given device wallet. The device
wallet sending the user operation has to be a wallet the registry recognizes.

```ts
const hash = await kokio.eSIMWalletFactory!.deployESIMWalletWithUserOp(
  deviceWalletAddress,
  salt, // bigint, makes the eSIM wallet's address unique
);
```

Returns: `Promise<Hash>`, a user operation hash.

## getCurrentESIMWalletImplementation

Reads the eSIM wallet implementation contract every new eSIM wallet points
at.

```ts
const impl = await kokio.eSIMWalletFactory!.getCurrentESIMWalletImplementation();
```

Returns: `Promise<Address>`.
