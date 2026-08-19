# eSIM wallet factory

`admin.eSIMWalletFactory`

Admin-only settings on the factory that deploys eSIM wallets. Deploying an
eSIM wallet itself is not exposed here, that call is restricted to the
registry, the device wallet factory, or the owning device wallet, so it
always reverts from a bare admin EOA. Use `kokio.eSIMWalletFactory` (mobile)
for actual deploys.

```ts
const hash = await admin.eSIMWalletFactory.addRegistryAddress(registryAddress);
```

## addRegistryAddress

One-time setup call that wires the registry address into the eSIM wallet
factory. Run once, as part of initial deployment.

```ts
const hash = await admin.eSIMWalletFactory.addRegistryAddress(registryAddress);
```

Returns: `Promise<Hash>`.

## updateESIMWalletImplementation

Points the eSIM wallet beacon at a new implementation contract. Moves every
deployed eSIM wallet to the new code at once.

```ts
const hash = await admin.eSIMWalletFactory.updateESIMWalletImplementation(newImplementation);
```

Returns: `Promise<Hash>`.

## isESIMWalletDeployed

Checks whether an address is an eSIM wallet this factory deployed.

```ts
const deployed = await admin.eSIMWalletFactory.isESIMWalletDeployed(eSIMWalletAddress);
```

Returns: `Promise<boolean>`.

## getCurrentESIMWalletImplementation

Reads the eSIM wallet implementation contract every new eSIM wallet points
at.

```ts
const impl = await admin.eSIMWalletFactory.getCurrentESIMWalletImplementation();
```

Returns: `Promise<Address>`.

## owner

Reads the current owner of the factory contract. On the live deployment this
is the `protocolAdmin` timelock.

```ts
const owner = await admin.eSIMWalletFactory.owner();
```

Returns: `Promise<Address>`.

## pendingOwner

Reads the address named in a pending `transferOwnership`, if any.

```ts
const pending = await admin.eSIMWalletFactory.pendingOwner();
```

Returns: `Promise<Address>`.

## proxiableUUID

Reads the UUPS implementation slot.

```ts
const slot = await admin.eSIMWalletFactory.proxiableUUID();
```

Returns: `Promise<Hex>`.

## upgradeInterfaceVersion

Reads the UUPS interface version string the current implementation reports.

```ts
const version = await admin.eSIMWalletFactory.upgradeInterfaceVersion();
```

Returns: `Promise<string>`.

## acceptOwnership

Accepts a pending ownership transfer. Call this from the account named as
`pendingOwner`.

```ts
const hash = await admin.eSIMWalletFactory.acceptOwnership();
```

Returns: `Promise<Hash>`.

## transferOwnershipCall

Builds the call payload to hand ownership of the factory to a new address.
On the live deployment the owner is the `protocolAdmin` timelock, so hand
the result to `protocolAdmin.proposer.schedule` rather than sending it
directly.

Handing over ownership also hands over the eSIM wallet beacon, since the
factory owns it.

```ts
const call = await admin.eSIMWalletFactory.transferOwnershipCall(newOwner);
const scheduled = await admin.protocolAdmin.proposer.schedule(call);
```

Returns: `Promise<OwnerCall>`.

## upgradeCall

Builds the call payload to point the factory's own proxy at a new
implementation. Hand the result to `protocolAdmin.proposer.schedule`.

This does not touch already-deployed eSIM wallets, they move through
`updateESIMWalletImplementation` and the beacon instead.

```ts
const call = await admin.eSIMWalletFactory.upgradeCall(newImplementation);
const scheduled = await admin.protocolAdmin.proposer.schedule(call);
```

Returns: `Promise<OwnerCall>`.
