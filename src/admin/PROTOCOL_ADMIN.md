# ProtocolAdmin

`ProtocolAdmin` is the timelock that owns `Registry`, `LazyWalletRegistry`,
`DeviceWalletFactory` and `ESIMWalletFactory`. Both wallet beacons sit under the
two factories, so owning the factories reaches every device wallet and every eSIM
wallet.

Every owner change goes one way. A proposer schedules it, the delay runs out, and
anyone executes it. Guardians are the exception: three powers, no wait, and each
one takes something away rather than handing it out.

Read this if you hold `PROPOSER_ROLE` or `GUARDIAN_ROLE`. Backend operators who
only drive the eSIM wallet admin want [README.md](README.md) instead.

## Deployment

| Chain | ProtocolAdmin | Min delay | Floor |
|---|---|---|---|
| Base Sepolia (84532) | `0x77A1D6f27462c34BF038832d9Cff6b3E94a9Fe6F` | 2 days | 1 hour |

No other chain is configured. Constructing `KokioAdmin` against one and calling
anything throws `UnconfiguredChainError` before a transaction is built.

The floor is immutable. `updateDelay` can write any value, including zero, but
`getMinDelay` clamps to the floor and `schedule` measures against `getMinDelay`.

## Setup

Same for both roles. The SDK needs a viem `WalletClient` carrying your key, and
nothing else. No bundler, no paymaster.

```ts
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { KokioAdmin } from "kokio-sdk/admin";

const walletClient = createWalletClient({
  account: privateKeyToAccount(process.env.PROPOSER_KEY as `0x${string}`),
  chain: baseSepolia,
  transport: http(process.env.BASE_SEPOLIA_RPC_URL),
});

const admin = new KokioAdmin(walletClient);
const timelock = admin.protocolAdmin;
```

Writes need an account on the client. Without one they throw
`MissingEOAWalletError` before touching the chain. Reads do not: they extend the
client with viem `publicActions` internally, so an account-less client can watch
operations all day.

The SDK does not check your roles. `timelock.proposer`, `.canceller`,
`.executor` and `.guardian` group the surface by the key each one needs, but the
check happens on chain. Calling `proposer.schedule` from a guardian key reverts
with `AccessControlUnauthorizedAccount`.

To act as more than one role in one process, build a client per key and give each
its own `KokioAdmin`. `setWalletClient` swaps the key on an existing instance if
you would rather keep one reference.

## Roles

| Role | Who holds it | What it can do |
|---|---|---|
| `PROPOSER_ROLE` | Named at deployment | Schedule operations. Also cancel, since the base contract pairs the two. |
| `CANCELLER_ROLE` | Proposers, plus any veto-only keys | Cancel a pending operation. Nothing else. |
| `EXECUTOR_ROLE` | The zero address | Held by nobody in particular, which makes execution open to any funded EOA. |
| `GUARDIAN_ROLE` | Named at deployment | Release a pause, strip a canceller, suspend the admin key. No delay on any of the three. |
| `DEFAULT_ADMIN_ROLE` | The timelock itself | Grant and revoke roles. Since only the contract holds it, every role change is a scheduled operation. |

Guardians are granted `EXECUTOR_ROLE` alongside their own role, so they can still
execute if open execution is ever closed off.

A guardian may not also be a proposer or a canceller, and the contract enforces
it rather than documenting it. Try to grant either and `grantRole` reverts
`RolesMustNotOverlap`. The reason is recovery: a guardian holding the cancel
power could strip every other canceller, become the only one, and then cancel its
own eviction forever.

Read a role id off the contract rather than hardcoding the hash:

```ts
const guardianRole = await timelock.GUARDIAN_ROLE();
await timelock.hasRole(guardianRole, someAddress);
```

## Scheduling an owner call

Three steps: build the call, schedule it, execute it once the delay is up.

### 1. Build the call

An `OwnerCall` is what viem's `writeContract` would take, minus the account.

```ts
import { Registry } from "kokio-sdk/abis";

const { factoryAddresses } = await admin.constants;

const call = {
  address: factoryAddresses.REGISTRY,
  abi: Registry,
  functionName: "updateVaultAddress",
  args: [newVault],
};
```

`value` is optional and defaults to zero. If you set it, the timelock has to be
holding that ETH when the operation runs, because the call is made from its
address.

### 2. Schedule

```ts
const op = await timelock.proposer.schedule(call);
```

**Keep the object it returns.** `execute` rebuilds the operation id from those
fields, and the timelock recomputes the same hash. Change any one of them and the
lookup finds an operation that was never scheduled. Lose the object entirely and
you have to recover the arguments from the `CallScheduled` event.

`delay` defaults to `getMinDelay()`. Pass a longer one as the third argument if
you want more notice than the minimum. A shorter one reverts.

Scheduling the same call twice is the one thing that catches people out. With the
default zero salt, the operation id is a function of the call alone, so a second
identical schedule collides with the first, whether the first is pending or long
since executed. Pass a salt to schedule the same call again:

```ts
import { toHex } from "viem";

const op = await timelock.proposer.schedule(call, { salt: toHex(2, { size: 32 }) });
```

`predecessor` is the other option. Give it another operation's id and this one
refuses to run until that one is done.

### 3. Execute

Open to anyone with gas. The proposer key does not need to still exist.

```ts
if (await timelock.isOperationReady(op.id)) {
  await timelock.executor.execute(op);
}
```

## Watching an operation

```ts
import { OperationState } from "kokio-sdk/admin";

await timelock.getOperationState(op.id);   // Unset, Waiting, Ready or Done
await timelock.isOperationPending(op.id);  // scheduled, not yet run
await timelock.isOperationReady(op.id);    // delay served, run it now
await timelock.isOperationDone(op.id);     // already run
await timelock.getTimestamp(op.id);        // unix seconds
```

`getTimestamp` overloads its return value. It reads `0` for an operation the
timelock has never seen and the literal `1` for one already done, neither of
which is a time. Check the state first, then read the timestamp.

You can get the id without scheduling anything, which is useful for checking
whether a call is already in flight:

```ts
const id = await timelock.operationId(call);
```

To report the current delay, read `getMinDelay()`. Do not follow the
`MinDelayChange` event: it carries whatever `updateDelay` stored, which is not the
floor that overrides it.

## Batches

Use `scheduleBatch` where the calls only make sense together. It runs them in one
transaction, so either all of them land or none do.

```ts
const op = await timelock.proposer.scheduleBatch([callA, callB]);
await timelock.executor.executeBatch(op);
```

A batch hashes differently from the same calls scheduled one at a time. Use
`operationIdBatch` for its id, and keep the `ScheduledBatchOperation` object the
same way you would keep a single one.

The case that needs a batch is evicting a guardian. Installing one grants
`GUARDIAN_ROLE` and `EXECUTOR_ROLE` together, but `revokeRole` cannot tell that
pairing from an independent grant, so removing one takes both revocations in a
single batch:

```ts
const guardianRole = await timelock.GUARDIAN_ROLE();
const executorRole = await timelock.EXECUTOR_ROLE();

await timelock.proposer.scheduleBatch([
  await timelock.revokeRoleCall(guardianRole, badGuardian),
  await timelock.revokeRoleCall(executorRole, badGuardian),
]);
```

## Calls that only exist as payloads

Four functions on `ProtocolAdmin` require `msg.sender == address(this)`, so the
only way to reach them is to schedule one. The SDK exposes them as builders that
return an `OwnerCall` instead of sending a transaction.

| Builder | Effect |
|---|---|
| `grantRoleCall(role, account)` | Grant a role. Granting `GUARDIAN_ROLE` adds `EXECUTOR_ROLE` with it. |
| `revokeRoleCall(role, account)` | Revoke one role. See the batch note above. |
| `updateDelayCall(newDelay)` | Change the delay. Still clamped by `minDelayFloor`. |
| `disableAndNominateCall(target, newAdmin)` | Suspend a contract's admin and nominate its replacement in one operation. |

Four more builders exist for the registry's own owner functions. These are aimed
at the registry, not at the timelock:

| Builder | Effect |
|---|---|
| `disableAdminCall(target?)` | Suspend the admin key. Defaults to the registry. |
| `enableAdminCall(target?)` | Lift a suspension. Defaults to the registry. |
| `unpauseCall(target?)` | Release the protocol pause. Defaults to the registry. |
| `setDefaultDataBundlePriceCapCall(cap, target?)` | Set the fallback price ceiling in wei. Zero reverts. |

There is no `pauseCall`. Tripping the pause is `onlyESIMWalletAdmin`, so the
timelock cannot do it at all: that is the backend key's own lever, and the split
is what stops one hot key both freezing funds and releasing them. `unpauseCall`
is the scheduled release, and a guardian holding `unpauseInstantly` is the one
that does not wait.

`setDefaultDataBundlePriceCapCall` rejecting zero is checked on execution, not on
scheduling, so a zero costs the whole delay before it fails.

All eight go the same route:

```ts
const op = await timelock.proposer.schedule(await timelock.disableAdminCall());
// ... 2 days ...
await timelock.executor.execute(op);
```

`disableAndNominate` is worth preferring over a bare `requestAdminUpdate` when
you are replacing a key. Both suspend the incumbent, because the registry strips
it the moment a nomination is outstanding, but the named function says so in the
operation itself rather than leaving a reviewer to infer it from calldata. The
nominee still has to accept, and the role stays dormant until it does.

For calldata that did not come from an ABI in this SDK, `proposer.scheduleRaw`
and `executor.executeRaw` take the `(target, value, payload, predecessor, salt)`
tuple directly.

## Guardian

Three functions. No fourth is expressible, whatever else the key holds.

```ts
await timelock.guardian.unpauseInstantly(target);
await timelock.guardian.revokeCancellersInstantly([account]);
await timelock.guardian.disableAdminInstantly();  // defaults to the registry
```

**`unpauseInstantly(target)`** releases a pause. The selector is fixed in the
contract, so it cannot be pointed at anything else on the target. An upgrade that
waits is reviewable. An outage that waits is an outage.

**`revokeCancellersInstantly(accounts)`** strips `CANCELLER_ROLE` and nothing
else. It exists because without it a compromised canceller is permanent: evicting
any role holder means scheduling `revokeRole`, and a canceller can cancel its own
eviction forever. It is all or nothing, and an account that does not hold the
role reverts the whole batch with `NotACanceller` rather than being skipped. A
guardian working from a list during an incident is never left believing a veto is
gone while it is still there.

**`disableAdminInstantly(target?)`** suspends the admin key. `target` defaults to
the registry, which is where the admin address lives; everything else in the
protocol reads it from there, so suspending it at the registry closes every gate
at once. The address stays on the books as `adminOfRecord`, so lifting the
suspension does not need it supplied again.

### There is no instant enable

`enableAdmin` has no guardian form, and that is the point. Suspending is instant;
restoring waits out the full delay, however the key is held. Reverse that and a
compromised key could undo its own suspension. The side taking power away has to
win the race against the side handing it back.

The same asymmetry runs through all three powers. None of them grants anything, so
none of them reaches user funds. Releasing a pause cannot move ETH, stripping a
canceller cannot, and a suspended admin is an admin that has stopped being able to
spend rather than one the guardian chose. The worst a guardian can do is stop the
backend, and the owner ends that.

### Incident runbook

A compromised eSIM wallet admin key, which holds `Registry.pause`:

1. `guardian.disableAdminInstantly()`. Do this first. Until the key is suspended
   it can re-apply the pause after every release.
2. `guardian.unpauseInstantly(registryAddress)` if it left a pause behind. With no
   guardian key to hand, the scheduled form is `unpauseCall()`, and the protocol
   stays frozen for the delay.
3. Confirm: `admin.registry.adminDisabled()` reads `true`,
   `admin.registry.eSIMWalletAdmin()` reads the zero address, and
   `admin.registry.paused()` reads `false`.
4. Hand off to a proposer. Replacing the key is
   `disableAndNominateCall(registry, newAdmin)` and waits out the delay. Lifting
   the suspension on the same key is `enableAdminCall()` and waits too.

`adminOfRecord` and `adminDisabled` have to be read together to tell a suspension
apart from a pending nomination. `eSIMWalletAdmin()` answers zero in both cases,
while `adminOfRecord` holds the address either way.

## Cancelling

```ts
await timelock.canceller.cancel(op.id);
```

Needs `CANCELLER_ROLE`, which every proposer also holds. Only works while the
operation is pending. A cancelled operation returns to `Unset`, so the same call
can be scheduled again with the same salt.

## Ownership handover

`acceptOwnershipBatch` finishes a two-step handover for contracts that have
already offered their ownership to the timelock.

```ts
await timelock.acceptOwnershipBatch([registryAddress, lazyWalletRegistryAddress]);
```

Permissionless, and safe to be: it only accepts an offer the current owner
already made, and the offer was the decision. It reverts `OwnershipNotOffered` for
any target whose `pendingOwner` is not the timelock, and one failure takes the
whole batch down.

Scheduling this instead would mean waiting out the delay before the timelock
could own anything, including during the deployment installing it.

## Leaving a role

```ts
await timelock.renounceRole(role, myAddress);
```

The chain requires `account` to be the caller, so this is the one role change
that does not wait. Every other grant or revoke is a scheduled operation.

## Failure cases

| What you see | Why |
|---|---|
| `MissingEOAWalletError` | The wallet client has no account. Reads are fine; writes are not. |
| `UnconfiguredChainError` | The chain has address placeholders. Only Base Sepolia is deployed. |
| `UnsupportedChainError` | The chain id is not in the SDK's list at all. |
| `AccessControlUnauthorizedAccount` | Wrong key for the function. The SDK groups by role but does not check it. |
| `TimelockUnauthorizedCaller` | A self-call-only function was called directly. Schedule it instead. |
| `RolesMustNotOverlap` | Tried to make a guardian a proposer or canceller, or the reverse. |
| `NotACanceller` | An account in `revokeCancellersInstantly` did not hold the role. |
| `OwnershipNotOffered` | A target in `acceptOwnershipBatch` has a different `pendingOwner`. |
| `TimelockUnexpectedOperationState` | Executing before the delay, executing twice, or scheduling a call that already has this id. Pass a salt. |
| `AdminAlreadyDisabled` / `AdminNotDisabled` | The suspension is already in the state you asked for. Both refuse a no-op rather than passing quietly. |

Every write in this module throws `ContractRevertError` when the chain reverts
with one of these, decoded and ready to read:

```ts
try {
  await admin.protocolAdmin.executor.execute(operation);
} catch (err) {
  if (err instanceof ContractRevertError) {
    console.error(err.decoded?.errorName, err.decoded?.args);
  }
}
```
