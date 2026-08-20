# eSIM wallet factory

`kokio.eSIMWalletFactory`

Deploys a new eSIM wallet for a device wallet. Present as soon as `Kokio` has
a `smartAccountClient`, chain-wide like the device wallet factory.

```ts
const hash = await kokio.eSIMWalletFactory!.deployESIMWalletWithUserOp(deviceWalletAddress, salt);
```

## deployESIMWalletWithUserOp

Deploys a new eSIM wallet, owned by the given device wallet. Use it when a
user is adding a new eSIM to a device wallet they already have. The device
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
