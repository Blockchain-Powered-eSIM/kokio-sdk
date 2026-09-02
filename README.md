# Kokio SDK

A TypeScript SDK for interacting with the Koki'o eSIM smart contracts. It wraps
[viem](https://viem.sh), including its account abstraction module, so that two
very different callers can use the same contracts:

- the **mobile app** (Expo / React Native), which acts on behalf of a user through
  an ERC-4337 device-wallet smart account signed by an on-device passkey, and
- the **backend server**, which acts as the platform admin through a plain EOA.

Each caller has its own entry point so it only deals with the parameters it
actually needs.

| Entry point | Import | Signer | For |
| --- | --- | --- | --- |
| `Kokio` | `kokio-sdk` | Passkey (WebAuthn P-256) via user operations | Mobile app |
| `KokioAdmin` | `kokio-sdk/admin` | Admin / owner EOA via direct transactions | Backend server |

This README covers setup and the common flows. For every method on every
surface, with a code example and return type, see the
[full SDK reference](docs/README.md).

## Installation

```sh
npm install kokio-sdk
```

The package ships as ES modules and requires Node 18 or newer (or a React Native
runtime). `viem` is bundled as a dependency, so you do not need to install it
separately.

## Mobile client (Expo / React Native)

The mobile surface represents a user's **device wallet**, an ERC-4337 smart
account whose owner is a P-256 passkey stored on the device. Actions are sent as
user operations through a bundler and signed with the passkey, so no private key
is ever held in the app.

You will need:

- a viem `WalletClient` connected to the target chain,
- the passkey `credentialId` and `rpId` registered for the device,
- a Pimlico API key and a gas policy id (used by the bundler and paymaster).

```ts
import { Kokio } from "kokio-sdk";
import { createWalletClient, http } from "viem";
import { baseSepolia } from "viem/chains";

const walletClient = createWalletClient({ chain: baseSepolia, transport: http() });

const kokio = new Kokio(
  walletClient,
  credentialId,        // passkey credential id on the device
  rpId,                // relying party id (your app domain)
  pimlicoAPIKey,
  gasPolicyId,
);

// 1. Resolve the smart account for this device passkey. `ownerKey` is the
//    passkey's P-256 public key as [x, y] hex coordinates; `salt` makes the
//    counterfactual address unique per user.
const account = await kokio.smartAccount.getSmartWallet(deviceUniqueIdentifier, ownerKey, salt);

// 2. Build a bundler-backed client for that account.
const smartAccountClient = await kokio.smartAccount.getSmartWalletClient(account);

// 3. Re-create Kokio with the smart account client (and any known instance
//    addresses) so the contract surfaces become available.
const session = new Kokio(
  walletClient,
  credentialId,
  rpId,
  pimlicoAPIKey,
  gasPolicyId,
  smartAccountClient,
  deviceWalletAddress,
  eSIMWalletAddress,
);

// 4. Send a user operation. The passkey signs it on the device.
const hash = await session.deviceWallet!.toggleAccessToFunds(eSIMWalletAddress, true);
await smartAccountClient.waitForUserOperationTransaction({ hash });
```

The contract surfaces (`deviceWallet`, `eSIMWallet`, `deviceWalletFactory`,
`eSIMWalletFactory`, `registry`, `paymentAdapter`, `P256Verifier`) are only
present once a `smartAccountClient` is supplied, which is why the example
constructs `Kokio` twice. Instance surfaces (`deviceWallet`, `eSIMWallet`) also
need their contract address. They stay `undefined` until you pass it.

A device wallet often holds more than one eSIM wallet, and the app needs to
switch which one it is acting on without resolving the smart account again.
Bind a new instance address with a setter and keep using the same `Kokio`
reference:

```ts
session.setESIMWalletAddress(anotherESIMWalletAddress);
const asset = "0x5553444300000000000000000000000000000000000000000000000000000000"; // "USDC"
const priceUSDCents = 500n; // $5.00
const maxAmountIn = await session.paymentAdapter!.quote(asset, priceUSDCents);
const hash = await session.eSIMWallet!.buyDataBundleWithToken(
  { id: bundleId, priceUSDCents, settlement: Settlement.DeviceWallet },
  asset,
  maxAmountIn,
  paymentReference, // from the backend
);
```

`setDeviceWalletAddress` and `setESIMWalletAddress` each mutate the instance
and return `this`, so they can be chained. Both need a `smartAccountClient`
already on the instance; without one the corresponding surface stays
`undefined`, same as when no address is passed to the constructor.

The passkey signing path depends on
[`react-native-passkey`](https://github.com/f-23/react-native-passkey) and runs
only on a device or simulator that supports WebAuthn. It is not available in a
plain Node process.

## Backend server (admin)

The backend surface, `KokioAdmin`, exposes exactly the contract functions that are
restricted on chain to the admin or owner EOA (`onlyAdmin`, `onlyOwner`,
`onlyESIMWalletAdmin`). These can never be called through a device-wallet user
operation, so they live here instead. No bundler, paymaster, or passkey is
involved. A viem `WalletClient` carrying the admin account is all that is needed.

```ts
import { KokioAdmin } from "kokio-sdk/admin";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const account = privateKeyToAccount(process.env.ADMIN_PRIVATE_KEY as `0x${string}`);
const walletClient = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http(process.env.RPC_URL),
});

const admin = new KokioAdmin(walletClient);

// Deploy a device wallet for a user.
const deployHash = await admin.deviceWalletFactory.createAccount(
  deviceUniqueIdentifier,
  ownerKey,
  salt,
  depositAmount,
);
```

The backend often does not know a contract instance address at construction time.
It deploys a device wallet, then needs to act on it. Bind the address afterwards
with a setter and keep using the same `KokioAdmin` reference:

```ts
admin.setDeviceWalletAddress(deviceWalletAddress);
await admin.deviceWallet!.deployESIMWallet(salt);

admin.setESIMWalletAddress(eSIMWalletAddress);
const maxAmountIn = await admin.paymentAdapter.quote(asset, priceUSDCents);
await admin.eSIMWallet!.buyDataBundleWithToken(
  { id: bundleId, priceUSDCents, settlement: 0 }, // 0 = DeviceWallet pays
  asset,
  maxAmountIn,
  paymentReference,
);
```

`setDeviceWalletAddress`, `setESIMWalletAddress`, and `setWalletClient` each mutate
the instance and return `this`, so they can be chained. Admin methods send ordinary
transactions and resolve to a transaction hash.

The chain-wide surfaces (`deviceWalletFactory`, `eSIMWalletFactory`, `registry`,
`lazyWalletRegistry`, `protocolAdmin`) are available as soon as the instance
exists. The instance-scoped surfaces (`deviceWallet`, `eSIMWallet`) become
available once their address is set.

`protocolAdmin` wraps the timelock that owns `registry`, `lazyWalletRegistry`,
`deviceWalletFactory`, and `eSIMWalletFactory` on chain. It schedules, executes,
and cancels privileged calls behind a delay, split across four role-scoped
surfaces: `proposer` schedules a call, `executor` runs one once its delay has
passed, `canceller` cancels a pending one, and `guardian` bypasses the delay for
emergency actions such as unpausing or disabling a compromised admin.

## Types and ABIs

Two more subpaths support the entry points above:

- `kokio-sdk/types` re-exports the shared types (`P256Key`, `WebAuthnSignature`,
  `DataBundleDetails`, `KokioSmartAccountClient`, `OwnerCall`, and others) so you
  can type your own code without reaching into internal paths.
- `kokio-sdk/abis` re-exports the typed contract ABIs (`DeviceWallet`,
  `ESIMWallet`, `Registry`, `ProtocolAdmin`, and others), useful if you need to
  decode logs or call a contract directly with viem.

## Errors

Both entry points re-export a typed error surface, so you can catch and decode
on-chain reverts without reaching into internal module paths:

```ts
import { KokioError, ContractRevertError } from "kokio-sdk";        // or "kokio-sdk/admin"

try {
  await admin.registry.requestAdminUpdate(newAdmin);
} catch (err) {
  if (err instanceof ContractRevertError) {
    console.error("reverted:", err.message);
  }
}
```

`KokioError` is the base class. Subclasses include `MissingSmartWalletError`,
`MissingEOAWalletError`, `InvalidClientError`, `UnsupportedChainError`,
`CounterfactualMismatchError`, and `ContractRevertError`. `decodeContractRevert`
turns raw revert data into a readable reason.

The paginated `lazyWalletRegistry` calls on `KokioAdmin` can also throw a few
narrower `KokioError` subclasses that are not exported by name (for example
`BatchSizeOutOfRangeError`). Catch them with `instanceof KokioError` and read
`.code` instead of importing the specific class.

## Constants and supported chains

Both entry points expose an async `constants` getter with the resolved factory
addresses, chain, RPC URL, and custom-error selectors for the wallet client's
connected chain:

```ts
const { factoryAddresses, chain, rpcURL } = await kokio.constants;
```

The SDK resolves these from the wallet client's connected chain id, so you do not
pass addresses yourself. Base Sepolia (chain id `84532`) is the only chain with a
live deployment today. Ethereum, Optimism, and Arbitrum (mainnet and their
testnets) are wired into the chain-resolution logic but not yet deployed;
connecting to one of them throws `UnconfiguredChainError` until it is.

## Testing

`npm test` runs the offline unit suite with no network access. Two opt-in
integration tiers (a read-only parity check against a live RPC, and a local
`anvil` fork that exercises real write and user-operation flows) are documented in
[tests/README.md](tests/README.md).

## License

MIT. See [LICENSE](LICENSE).
