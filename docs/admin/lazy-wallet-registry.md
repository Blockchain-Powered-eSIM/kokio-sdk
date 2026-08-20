# Lazy wallet registry

`admin.lazyWalletRegistry`

Handles users who bought an eSIM before they had a device wallet, for
example through a fiat checkout instead of the app. Their purchase history
is recorded here first, then their device wallet and eSIM wallets are
deployed later, and their history is copied onto the real wallets once they
exist. Available as soon as `KokioAdmin` exists.

Deploying a device and copying its history both take more than one
on-chain transaction once a device has enough eSIMs or purchases. Use the
run-to-completion methods below for normal use, they handle that pagination
for you and can be safely retried if a call is interrupted partway through.

```ts
await admin.lazyWalletRegistry.batchPopulateHistory(deviceIds, eSIMIdsPerDevice, purchasesPerDevice);
const deployment = await admin.lazyWalletRegistry.deployLazyWalletAndSetESIMIdentifier(
  ownerKey, deviceUniqueIdentifier, salt, depositAmount,
);
```

## batchPopulateHistory

Records purchase history for a batch of devices that have no wallet yet.
Call this first, before deploying anything: the deploy step refuses a
device that already has a wallet, and expects its history to already be
recorded.

```ts
const hash = await admin.lazyWalletRegistry.batchPopulateHistory(
  deviceUniqueIdentifiers,     // string[]
  eSIMUniqueIdentifiersPerDevice, // string[][], one array of eSIM ids per device
  purchasesPerDevice,          // DataBundleDetails[][], one array of purchases per device
);
```

Returns: `Promise<Hash>`.

## deployLazyWalletAndSetESIMIdentifier

Deploys a device wallet and every one of its eSIM wallets, sending as many
transactions as it takes and waiting for the whole device to finish. This is
the normal way to deploy a lazy-provisioned device.

Safe to call again with the same arguments (and `depositAmount` of `0n`) if
a previous call stopped partway through, for example because a transaction
was dropped. It picks up from where it left off instead of starting over.

```ts
const deployment = await admin.lazyWalletRegistry.deployLazyWalletAndSetESIMIdentifier(
  ownerKey,
  deviceUniqueIdentifier,
  salt,
  depositAmount,
  10n, // optional, how many eSIM wallets to deploy per transaction
);
```

Returns: `Promise<LazyDeployment>`, `{ deviceWallet, eSIMWallets, eSIMIdentifiers, batches, alreadyComplete }`.

## setHistoryForLazyWallet

Copies one eSIM's whole recorded purchase history onto its deployed wallet,
sending as many transactions as it takes. Call this once the eSIM's wallet
has been deployed by `deployLazyWalletAndSetESIMIdentifier`.

Safe to retry the same way as the deploy call, and safe to run while the
device's other eSIM wallets are still being deployed, since the history
cursor is tracked per eSIM rather than per device.

```ts
const copy = await admin.lazyWalletRegistry.setHistoryForLazyWallet(
  eSIMIdentifier,
  25n, // optional, how many entries to copy per transaction
);
```

Returns: `Promise<LazyHistoryCopy>`, `{ eSIMWallet, copied, batches, alreadyComplete }`.

## switchESIMIdentifierToNewDeviceIdentifier

Moves an eSIM identifier's history record from one device identifier to
another. Use this if a user's eSIM needs to be reassigned to a different
device before deployment.

```ts
const hash = await admin.lazyWalletRegistry.switchESIMIdentifierToNewDeviceIdentifier(
  eSIMIdentifier, oldDeviceIdentifier, newDeviceIdentifier,
);
```

Returns: `Promise<Hash>`.

## deployLazyWalletFirstBatch

Sends exactly one deploy transaction, mirroring the contract call directly
instead of running the device to completion. Use `deployLazyWalletAndSetESIMIdentifier`
for normal use; reach for this only if you want to drive the batching
yourself.

```ts
const hash = await admin.lazyWalletRegistry.deployLazyWalletFirstBatch(
  ownerKey, deviceUniqueIdentifier, salt, depositAmount, 10n,
);
```

Returns: `Promise<Hash>`.

## deployMoreESIMWalletsForLazyDevice

Sends one more deploy transaction for a device the first batch already
started. Same one-transaction, manual-batching use case as
`deployLazyWalletFirstBatch`.

```ts
const hash = await admin.lazyWalletRegistry.deployMoreESIMWalletsForLazyDevice(deviceUniqueIdentifier, 10n);
```

Returns: `Promise<Hash>`.

## setHistoryForLazyWalletBatch

Sends exactly one history-copy transaction. Same manual-batching use case as
the deploy calls above, for `setHistoryForLazyWallet`.

```ts
const hash = await admin.lazyWalletRegistry.setHistoryForLazyWalletBatch(eSIMIdentifier, 25n);
```

Returns: `Promise<Hash>`.

## upgradeManager

Reads the upgrade-manager (owner) EOA recorded here.

```ts
const manager = await admin.lazyWalletRegistry.upgradeManager();
```

Returns: `Promise<Address>`.

## eSIMIdentifierToDeviceIdentifier

Reads which device identifier an eSIM identifier is currently associated
with.

```ts
const deviceId = await admin.lazyWalletRegistry.eSIMIdentifierToDeviceIdentifier(eSIMIdentifier);
```

Returns: `Promise<string>`.

## MAX_ESIM_WALLETS_PER_CALL

Reads the contract's cap on how many eSIM wallets one deploy transaction may
create.

```ts
const max = await admin.lazyWalletRegistry.MAX_ESIM_WALLETS_PER_CALL();
```

Returns: `Promise<bigint>`.

## MAX_HISTORY_ENTRIES_PER_CALL

Reads the contract's cap on how many history entries one transaction may
copy.

```ts
const max = await admin.lazyWalletRegistry.MAX_HISTORY_ENTRIES_PER_CALL();
```

Returns: `Promise<bigint>`.

## eSIMWalletsDeployed

Reads how many of a device's eSIM wallets are already deployed. Non-zero
exactly when the device's first deploy batch has run, so it also tells you
whether deployment has started at all.

```ts
const deployed = await admin.lazyWalletRegistry.eSIMWalletsDeployed(deviceIdentifier);
```

Returns: `Promise<bigint>`.

## lazyDeploymentSalt

Reads the salt the device's first deploy batch used. Every later batch for
the same device derives its addresses from this salt.

```ts
const salt = await admin.lazyWalletRegistry.lazyDeploymentSalt(deviceIdentifier);
```

Returns: `Promise<bigint>`.

## lazyDeployedESIMWallet

Reads the eSIM wallet this registry deployed for an identifier. Zero for any
identifier this registry did not deploy, which is what the contract checks
before allowing a history copy.

```ts
const wallet = await admin.lazyWalletRegistry.lazyDeployedESIMWallet(eSIMIdentifier);
```

Returns: `Promise<Address>`.

## historyEntriesCopied

Reads how many of an eSIM's stored purchase entries have already reached its
deployed wallet.

```ts
const copied = await admin.lazyWalletRegistry.historyEntriesCopied(eSIMIdentifier);
```

Returns: `Promise<bigint>`.

## isDeviceIdentifierReserved

Checks whether a device identifier has purchase history recorded against it
here. This reads `true` as soon as `batchPopulateHistory` runs for it, well
before any wallet is deployed, unlike `registry.isDeviceIdentifierAlreadyUsed`
which only tracks real deployments.

```ts
const reserved = await admin.lazyWalletRegistry.isDeviceIdentifierReserved(deviceIdentifier);
```

Returns: `Promise<boolean>`.

## isESIMIdentifierReserved

Checks whether an eSIM identifier is bound to a device here.

```ts
const reserved = await admin.lazyWalletRegistry.isESIMIdentifierReserved(eSIMIdentifier);
```

Returns: `Promise<boolean>`.

## deviceIdentifierToESIMDetails

Reads one recorded purchase for a device and eSIM pair, by its position in
the list. There is no length getter, so read upward from `0n` until a call
reverts.

```ts
const purchase = await admin.lazyWalletRegistry.deviceIdentifierToESIMDetails(deviceIdentifier, eSIMIdentifier, 0n);
```

Returns: `Promise<DataBundleDetails>`, `{ dataBundleID, dataBundlePrice }`.

## eSIMIdentifiersAssociatedWithDeviceIdentifier

Reads one eSIM identifier associated with a device, by its position in the
list. Same no-length-getter pattern as `deviceIdentifierToESIMDetails`.

```ts
const eSIMId = await admin.lazyWalletRegistry.eSIMIdentifiersAssociatedWithDeviceIdentifier(deviceIdentifier, 0n);
```

Returns: `Promise<string>`.

## owner

Reads who holds `onlyOwner` here. On the live deployment this is the
`protocolAdmin` timelock.

```ts
const owner = await admin.lazyWalletRegistry.owner();
```

Returns: `Promise<Address>`.

## pendingOwner

Reads the address a `transferOwnership` call is waiting on.

```ts
const pending = await admin.lazyWalletRegistry.pendingOwner();
```

Returns: `Promise<Address>`.

## proxiableUUID

Reads the UUPS implementation slot.

```ts
const slot = await admin.lazyWalletRegistry.proxiableUUID();
```

Returns: `Promise<Hex>`.

## upgradeInterfaceVersion

Reads the UUPS interface version string the current implementation reports.

```ts
const version = await admin.lazyWalletRegistry.upgradeInterfaceVersion();
```

Returns: `Promise<string>`.

## acceptOwnership

Accepts a pending ownership transfer. Call this from the account named as
`pendingOwner`.

```ts
const hash = await admin.lazyWalletRegistry.acceptOwnership();
```

Returns: `Promise<Hash>`.

## transferOwnershipCall

Builds the call payload to hand ownership of this contract to a new address.
On the live deployment the owner is the `protocolAdmin` timelock, so hand
the result to `protocolAdmin.proposer.schedule` rather than sending it
directly.

```ts
const call = await admin.lazyWalletRegistry.transferOwnershipCall(newOwner);
const scheduled = await admin.protocolAdmin.proposer.schedule(call);
```

Returns: `Promise<OwnerCall>`.

## upgradeCall

Builds the call payload to point this contract's proxy at a new
implementation. Hand the result to `protocolAdmin.proposer.schedule`.

This contract holds every fiat user's unclaimed purchase history, and it has
no other copy. Check the new implementation's storage layout carefully
before scheduling, there is no undo.

```ts
const call = await admin.lazyWalletRegistry.upgradeCall(newImplementation);
const scheduled = await admin.protocolAdmin.proposer.schedule(call);
```

Returns: `Promise<OwnerCall>`.
