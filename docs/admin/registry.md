# Registry

`admin.registry`

The admin-only side of the protocol-wide directory: pausing, price caps,
admin handover, and wiring the other contracts together. Available as soon
as `KokioAdmin` exists.

```ts
const hash = await admin.registry.pause();
```

## addOrUpdateLazyWalletRegistryAddress

Wires the lazy wallet registry address into the registry. Run once during
setup, or again if the lazy wallet registry is redeployed.

```ts
const hash = await admin.registry.addOrUpdateLazyWalletRegistryAddress(lazyWalletRegistryAddress);
```

Returns: `Promise<Hash>`.

## updateVaultAddress

Changes the vault address that receives eSIM payments.

```ts
const hash = await admin.registry.updateVaultAddress(newVaultAddress);
```

Returns: `Promise<Hash>`.

## requestAdminUpdate

Starts the two-step handover of the admin role to a new address. Use this to
rotate the backend's signing key.

This takes the role off the current admin right away: every admin-gated call
reverts until the new address accepts with `acceptAdminUpdate`. Send the two
steps close together, or user-facing calls that need the admin will fail in
between. Naming the current admin instead cancels a pending nomination.

```ts
const hash = await admin.registry.requestAdminUpdate(newAdminAddress);
```

Returns: `Promise<Hash>`.

## acceptAdminUpdate

Finishes the admin handover. Call this from the newly nominated admin
address, not the outgoing one.

```ts
const hash = await admin.registry.acceptAdminUpdate();
```

Returns: `Promise<Hash>`.

## disableAdmin

Suspends the admin's powers across the whole protocol. Use this if the
backend's admin key is compromised, as a way to freeze admin actions without
losing the address itself.

The address stays on record, so turning the admin back on does not need it
supplied again. Reverts if the admin is already suspended.

```ts
const hash = await admin.registry.disableAdmin();
```

Returns: `Promise<Hash>`.

## enableAdmin

Lifts a suspension started by `disableAdmin`.

```ts
const hash = await admin.registry.enableAdmin();
```

Returns: `Promise<Hash>`.

## assignESIMIdentifier

Binds an eSIM's unique identifier to its wallet. Use this once an eSIM
wallet is deployed and its real-world identifier is known.

The identifier can only be claimed once across the whole protocol: assigning
an identifier already bound to another wallet reverts.

```ts
const hash = await admin.registry.assignESIMIdentifier(eSIMWalletAddress, eSIMUniqueIdentifier);
```

Returns: `Promise<Hash>`.

## pause

Stops every ETH-moving path on every device wallet and eSIM wallet,
protocol-wide. This is the one emergency lever the admin key can pull on its
own: it can pause, but only the owner (the `protocolAdmin` timelock on the
live deployment) can unpause. Use it if something looks wrong and needs an
immediate stop.

```ts
const hash = await admin.registry.pause();
```

Returns: `Promise<Hash>`.

## unpause

Releases a pause. On the live deployment this needs the owner, so calling it
from the admin EOA directly reverts. Schedule
`admin.protocolAdmin.unpauseCall()` through
`admin.protocolAdmin.proposer.schedule` instead, or have a guardian call
`admin.protocolAdmin.guardian.unpauseInstantly` if the wait is not
acceptable.

```ts
const hash = await admin.registry.unpause();
```

Returns: `Promise<Hash>`.

## setDefaultDataBundlePriceCap

Sets the fallback price ceiling every eSIM wallet uses when it has no cap of
its own.

Zero reverts: a zero cap would read as "no limit" for every wallet without
one of its own, so the contract refuses it outright.

```ts
const hash = await admin.registry.setDefaultDataBundlePriceCap(cap);
```

Returns: `Promise<Hash>`.

## acceptOwnership

Accepts a pending ownership transfer. Call this from the account named as
`pendingOwner`.

```ts
const hash = await admin.registry.acceptOwnership();
```

Returns: `Promise<Hash>`.

## transferOwnershipCall

Builds the call payload to hand ownership of the registry to a new address.
On the live deployment the owner is the `protocolAdmin` timelock, so hand
the result to `protocolAdmin.proposer.schedule` rather than sending it
directly.

```ts
const call = await admin.registry.transferOwnershipCall(newOwner);
const scheduled = await admin.protocolAdmin.proposer.schedule(call);
```

Returns: `Promise<OwnerCall>`.

## upgradeCall

Builds the call payload to point the registry's proxy at a new
implementation. Hand the result to `protocolAdmin.proposer.schedule`.

There is no undo. Check the new implementation's storage layout matches
before scheduling: the contract checks only that the new address answers as
a compatible UUPS implementation, not that its storage lines up.

```ts
const call = await admin.registry.upgradeCall(newImplementation);
const scheduled = await admin.protocolAdmin.proposer.schedule(call);
```

Returns: `Promise<OwnerCall>`.

## owner

Reads who holds `onlyOwner` on the registry. On the live deployment this is
the `protocolAdmin` timelock.

```ts
const owner = await admin.registry.owner();
```

Returns: `Promise<Address>`.

## eSIMWalletAdmin

Reads the admin address that may currently act. Reads zero while a
nomination is pending or the admin is suspended, so a zero here means the
role is dormant rather than unset.

```ts
const admin_ = await admin.registry.eSIMWalletAdmin();
```

Returns: `Promise<Address>`.

## adminOfRecord

Reads the admin address on file, regardless of whether it is currently
active. Keeps naming a suspended admin, so lifting the suspension does not
need the address supplied again. Use `eSIMWalletAdmin` to ask who may
actually act right now.

```ts
const admin_ = await admin.registry.adminOfRecord();
```

Returns: `Promise<Address>`.

## adminDisabled

Checks whether the admin's powers are currently suspended.

```ts
const disabled = await admin.registry.adminDisabled();
```

Returns: `Promise<boolean>`.

## newRequestedAdmin

Reads the address nominated by `requestAdminUpdate`, if any.

```ts
const pending = await admin.registry.newRequestedAdmin();
```

Returns: `Promise<Address>`, zero if none.

## vault

Reads the vault address that receives eSIM payments.

```ts
const vault = await admin.registry.vault();
```

Returns: `Promise<Address>`.

## upgradeManager

Reads the upgrade-manager (owner) EOA recorded in the registry.

```ts
const manager = await admin.registry.upgradeManager();
```

Returns: `Promise<Address>`.

## lazyWalletRegistry

Reads the lazy wallet registry address wired into the registry.

```ts
const lazyRegistry = await admin.registry.lazyWalletRegistry();
```

Returns: `Promise<Address>`.

## uniqueIdentifierToDeviceWallet

Reads the device wallet registered for a device identifier.

```ts
const wallet = await admin.registry.uniqueIdentifierToDeviceWallet(deviceUniqueIdentifier);
```

Returns: `Promise<Address>`, zero if none.

## deviceWalletToOwner

Reads one of a device wallet's two P256 owner-key coordinates, by index (`0`
for x, `1` for y).

```ts
const x = await admin.registry.deviceWalletToOwner(deviceWalletAddress, 0n);
const y = await admin.registry.deviceWalletToOwner(deviceWalletAddress, 1n);
```

Returns: `Promise<Hex>`.

## registeredP256Keys

Reads the device wallet registered against a hash of an owner's P256 keys.
Use this to check whether a passkey is already tied to a wallet.

```ts
const wallet = await admin.registry.registeredP256Keys(hashOfOwnerKeys);
```

Returns: `Promise<Address>`, zero if none.

## isDeviceWalletValid

Checks whether a device wallet is registered with the protocol.

```ts
const valid = await admin.registry.isDeviceWalletValid(deviceWalletAddress);
```

Returns: `Promise<boolean>`.

## isESIMWalletValid

Reads the device wallet an eSIM wallet is registered against. Despite the
name this returns an address, not a boolean. This is a registration record,
not a current holder: it never goes back to zero once set, even after a
transfer. Ask `deviceWallet.isValidESIMWallet` who holds it right now.

```ts
const holder = await admin.registry.isESIMWalletValid(eSIMWalletAddress);
```

Returns: `Promise<Address>`, zero if the protocol never registered it.

## isESIMWalletOnStandby

Checks whether a transfer is outstanding on an eSIM wallet.

```ts
const onStandby = await admin.registry.isESIMWalletOnStandby(eSIMWalletAddress);
```

Returns: `Promise<boolean>`.

## paused

Checks whether the whole protocol is paused.

```ts
const paused = await admin.registry.paused();
```

Returns: `Promise<boolean>`.

## defaultDataBundlePriceCap

Reads the fallback price ceiling, in wei, for a wallet with no cap of its
own.

```ts
const cap = await admin.registry.defaultDataBundlePriceCap();
```

Returns: `Promise<bigint>`.

## isDeviceIdentifierAlreadyUsed

Checks whether a device identifier already has a wallet deployed on chain.

```ts
const used = await admin.registry.isDeviceIdentifierAlreadyUsed(deviceUniqueIdentifier);
```

Returns: `Promise<boolean>`.

## isESIMIdentifierClaimed

Checks whether an eSIM identifier is already held by a wallet.

```ts
const claimed = await admin.registry.isESIMIdentifierClaimed(eSIMUniqueIdentifier);
```

Returns: `Promise<boolean>`.

## eSIMWalletForIdentifier

Reads the eSIM wallet holding an eSIM identifier, by the identifier string.

```ts
const wallet = await admin.registry.eSIMWalletForIdentifier(eSIMUniqueIdentifier);
```

Returns: `Promise<Address>`, zero if nobody holds it.

## claimedESIMIdentifiers

Same answer as `eSIMWalletForIdentifier`, keyed by the identifier's
keccak256 hash instead of the raw string. Use this when the hash is already
what you have.

```ts
const wallet = await admin.registry.claimedESIMIdentifiers(hashOfESIMIdentifier);
```

Returns: `Promise<Address>`, zero if nobody holds it.

## requireDeviceIdentifierNotReserved

Throws if a fiat-path user's eSIMs are already waiting on this device
identifier. Worth checking before deploying.

```ts
await admin.registry.requireDeviceIdentifierNotReserved(deviceUniqueIdentifier);
```

Returns: `Promise<void>`.

## requireNotPaused

The same pause check as `paused`, but throws instead of returning `false`.

```ts
await admin.registry.requireNotPaused();
```

Returns: `Promise<void>`.

## pendingOwner

Reads the address a `transferOwnership` call is waiting on. Worth reading
before `protocolAdmin.acceptOwnershipBatch`, which reverts on any target
that has not actually been offered to the timelock.

```ts
const pending = await admin.registry.pendingOwner();
```

Returns: `Promise<Address>`.

## deviceWalletFactory

Reads the device wallet factory address wired into the registry.

```ts
const factory = await admin.registry.deviceWalletFactory();
```

Returns: `Promise<Address>`.

## eSIMWalletFactory

Reads the eSIM wallet factory address wired into the registry.

```ts
const factory = await admin.registry.eSIMWalletFactory();
```

Returns: `Promise<Address>`.

## entryPoint

Reads the ERC-4337 EntryPoint address the registry recognizes.

```ts
const entryPoint = await admin.registry.entryPoint();
```

Returns: `Promise<Address>`.

## proxiableUUID

Reads the UUPS implementation slot.

```ts
const slot = await admin.registry.proxiableUUID();
```

Returns: `Promise<Hex>`.

## upgradeInterfaceVersion

Reads the UUPS interface version string the current implementation reports.

```ts
const version = await admin.registry.upgradeInterfaceVersion();
```

Returns: `Promise<string>`.
