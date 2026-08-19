# Device wallet factory

`admin.deviceWalletFactory`

The EOA-signed side of device wallet deployment: creating wallets, batching
them for users who never held a key themselves, and the admin-only settings
on the factory. Available as soon as `KokioAdmin` exists.

```ts
const hash = await admin.deviceWalletFactory.createAccount(
  deviceUniqueIdentifier, ownerKey, salt, depositAmount,
);
```

## createAccount

Deploys a single device wallet, paid and signed by the admin EOA. Use this
for the normal one-user onboarding flow.

```ts
const hash = await admin.deviceWalletFactory.createAccount(
  deviceUniqueIdentifier,
  ownerKey,
  salt,
  depositAmount, // ETH sent as the wallet's starting gas deposit
);
```

Returns: `Promise<Hash>`.

## deployDeviceWalletForUsers

Deploys many device wallets in one transaction. Use it for batch onboarding,
for example lazy or fiat-path users who bought an eSIM before they had a
device wallet.

`value` is the total ETH sent for the whole batch, split across
`depositAmounts`. Any leftover is refunded on chain.

```ts
const hash = await admin.deviceWalletFactory.deployDeviceWalletForUsers(
  deviceUniqueIdentifiers, // string[]
  ownerKeys,               // P256Key[]
  salts,                   // bigint[]
  depositAmounts,          // bigint[]
  totalValue,              // bigint, sum of depositAmounts (or more)
);
```

Returns: `Promise<Hash>`.

## postCreateAccount

Registers a device wallet with the factory after it deploys. Use it right
after `createAccountWithEOA` on the mobile surface, since a mobile-deployed
wallet is not registered until this runs.

The salt has to match the one the deploy used: the factory recomputes the
wallet's address from it to check the wallet is real.

```ts
const hash = await admin.deviceWalletFactory.postCreateAccount(
  deviceWalletAddress, deviceUniqueIdentifier, ownerKey, salt,
);
```

Returns: `Promise<Hash>`.

## addRegistryAddress

One-time setup call that wires the registry address into the factory. Run
once, as part of initial deployment.

```ts
const hash = await admin.deviceWalletFactory.addRegistryAddress(registryAddress);
```

Returns: `Promise<Hash>`.

## updateDeviceWalletImplementation

Points the device wallet beacon at a new implementation contract. Moves
every deployed device wallet to the new code at once, since they all read
their implementation from the same beacon.

```ts
const hash = await admin.deviceWalletFactory.updateDeviceWalletImplementation(newImplementation);
```

Returns: `Promise<Hash>`.

## eSIMWalletAdmin

Reads the address allowed to deploy eSIM wallets and manage them as admin.

```ts
const admin_ = await admin.deviceWalletFactory.eSIMWalletAdmin();
```

Returns: `Promise<Address>`.

## deviceWalletInfoAdded

Checks whether the factory has finished registering a device wallet.

```ts
const registered = await admin.deviceWalletFactory.deviceWalletInfoAdded(deviceWalletAddress);
```

Returns: `Promise<boolean>`.

## getCurrentDeviceWalletImplementation

Reads the device wallet implementation contract every new wallet points at.

```ts
const impl = await admin.deviceWalletFactory.getCurrentDeviceWalletImplementation();
```

Returns: `Promise<Address>`.

## getCounterFactualAddress

Works out the address a device wallet will deploy to, without sending
anything.

```ts
const address = await admin.deviceWalletFactory.getCounterFactualAddress(ownerKey, deviceUniqueIdentifier, salt);
```

Returns: `Promise<Address>`.

## preCreateAccountValidation

Checks whether a device identifier or owner key is already taken, before
deploying.

```ts
const holder = await admin.deviceWalletFactory.preCreateAccountValidation(deviceUniqueIdentifier, ownerKey);
```

Returns: `Promise<Address>`, the zero address when both are free.

## beacon

Reads the beacon every device wallet reads its implementation from.

```ts
const beacon = await admin.deviceWalletFactory.beacon();
```

Returns: `Promise<Address>`.

## registry

Reads the registry address the factory writes newly deployed wallets into.

```ts
const registry = await admin.deviceWalletFactory.registry();
```

Returns: `Promise<Address>`.

## entryPoint

Reads the ERC-4337 EntryPoint address baked into every wallet this factory
deploys.

```ts
const entryPoint = await admin.deviceWalletFactory.entryPoint();
```

Returns: `Promise<Address>`.

## verifier

Reads the P256 verifier contract new device wallets use to check WebAuthn
signatures.

```ts
const verifier = await admin.deviceWalletFactory.verifier();
```

Returns: `Promise<Address>`.

## owner

Reads the current owner of the factory contract. On the live deployment this
is the `protocolAdmin` timelock, not a plain EOA.

```ts
const owner = await admin.deviceWalletFactory.owner();
```

Returns: `Promise<Address>`.

## pendingOwner

Reads the address named in a pending `transferOwnership`, if any.

```ts
const pending = await admin.deviceWalletFactory.pendingOwner();
```

Returns: `Promise<Address>`.

## proxiableUUID

Reads the UUPS implementation slot. Rarely needed directly, mostly useful
for verifying an upgrade by hand.

```ts
const slot = await admin.deviceWalletFactory.proxiableUUID();
```

Returns: `Promise<Hex>`.

## upgradeInterfaceVersion

Reads the UUPS interface version string the current implementation reports.

```ts
const version = await admin.deviceWalletFactory.upgradeInterfaceVersion();
```

Returns: `Promise<string>`.

## acceptOwnership

Accepts a pending ownership transfer. Call this from the account named as
`pendingOwner`.

If the incoming owner is the `protocolAdmin` timelock, use
`protocolAdmin.acceptOwnershipBatch` instead, which accepts for every
contract at once rather than one at a time.

```ts
const hash = await admin.deviceWalletFactory.acceptOwnership();
```

Returns: `Promise<Hash>`.

## transferOwnershipCall

Builds the call payload to hand ownership of the factory to a new address.
This does not send anything itself: on the live deployment the factory's
owner is the `protocolAdmin` timelock, so hand the result to
`protocolAdmin.proposer.schedule` instead of sending it directly.

Handing over ownership also hands over the device wallet beacon, since the
factory owns it, so the new owner can move every deployed device wallet at
once.

```ts
const call = await admin.deviceWalletFactory.transferOwnershipCall(newOwner);
const scheduled = await admin.protocolAdmin.proposer.schedule(call);
```

Returns: `Promise<OwnerCall>`.

## upgradeCall

Builds the call payload to point the factory's own proxy at a new
implementation. Same pattern as `transferOwnershipCall`: hand the result to
`protocolAdmin.proposer.schedule` rather than sending it directly.

This does not touch already-deployed device wallets, they move through
`updateDeviceWalletImplementation` and the beacon instead.

```ts
const call = await admin.deviceWalletFactory.upgradeCall(newImplementation);
const scheduled = await admin.protocolAdmin.proposer.schedule(call);
```

Returns: `Promise<OwnerCall>`.
