# Kokio SDK

A TypeScript SDK for interacting with the Koki'o eSIM smart contracts. It wraps
[viem](https://viem.sh) and [`@aa-sdk/core`](https://www.npmjs.com/package/@aa-sdk/core)
so that two very different callers can use the same contracts:

- the **mobile app** (Expo / React Native), which acts on behalf of a user through
  an ERC-4337 device-wallet smart account signed by an on-device passkey, and
- the **backend server**, which acts as the platform admin through a plain EOA.

Each caller has its own entry point so it only deals with the parameters it
actually needs.

| Entry point | Import | Signer | For |
| --- | --- | --- | --- |
| `Kokio` | `kokio-sdk` | Passkey (WebAuthn P-256) via user operations | Mobile app |
| `KokioAdmin` | `kokio-sdk/admin` | Admin / owner EOA via direct transactions | Backend server |

## Installation

```sh
npm install kokio-sdk
```

The package ships as ES modules and requires Node 18 or newer (or a React Native
runtime). `viem` and `@aa-sdk/core` are bundled as dependencies, so you do not
need to install them separately.

## Mobile client (Expo / React Native)

The mobile surface represents a user's **device wallet**, an ERC-4337 smart
account whose owner is a P-256 passkey stored on the device. Actions are sent as
user operations through a bundler and signed with the passkey, so no private key
is ever held in the app.

You will need:

- a viem `WalletClient` connected to the target chain,
- the passkey `credentialId` and `rpId` registered for the device,
- your `organizationId`, a Pimlico API key, and a gas policy id (used by the
  bundler and paymaster).

```ts
import { Kokio } from "kokio-sdk";
import { createWalletClient, http } from "viem";
import { baseSepolia } from "viem/chains";

const walletClient = createWalletClient({ chain: baseSepolia, transport: http() });

const kokio = new Kokio(
  walletClient,
  credentialId,        // passkey credential id on the device
  rpId,                // relying party id (your app domain)
  organizationId,
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
//    addresses) to unlock the contract surfaces.
const session = new Kokio(
  walletClient,
  credentialId,
  rpId,
  organizationId,
  pimlicoAPIKey,
  gasPolicyId,
  smartAccountClient,
  deviceWalletAddress,
  eSIMWalletAddress,
);

// 4. Send a user operation. The passkey signs it on the device.
const { hash } = await session.deviceWallet!.toggleAccessToETH(eSIMWalletAddress, true);
await smartAccountClient.waitForUserOperationTransaction({ hash });
```

The contract surfaces (`deviceWallet`, `eSIMWallet`, `deviceWalletFactory`,
`eSIMWalletFactory`, `lazyWalletRegistry`, `P256Verifier`) are only present once a
`smartAccountClient` is supplied, which is why the example constructs `Kokio`
twice. Instance surfaces (`deviceWallet`, `eSIMWallet`) also need their contract
address. They stay `undefined` until you pass it.

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
await admin.deviceWallet!.deployESIMWallet(true, salt);

admin.setESIMWalletAddress(eSIMWalletAddress);
await admin.eSIMWallet!.buyDataBundle({ dataBundleID, dataBundlePrice });
```

`setDeviceWalletAddress`, `setESIMWalletAddress`, and `setWalletClient` each mutate
the instance and return `this`, so they can be chained. Admin methods send ordinary
transactions and resolve to a transaction hash.

The chain-wide surfaces (`deviceWalletFactory`, `eSIMWalletFactory`, `registry`,
`lazyWalletRegistry`) are available as soon as the instance exists. The
instance-scoped surfaces (`deviceWallet`, `eSIMWallet`) become available once their
address is set.

## Errors

Both entry points re-export a typed error surface, so you can catch and decode
on-chain reverts without reaching into internal module paths:

```ts
import { KokioError, ContractRevertError } from "kokio-sdk";        // or "kokio-sdk/admin"

try {
  await admin.deviceWalletFactory.requestAdminUpdate(newAdmin);
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

## Supported chains

The SDK resolves the contract addresses from the wallet client's connected chain
id, so you do not pass them yourself. Base Sepolia (chain id `84532`) is the
deployment used in development. Sepolia and other testnets are also configured.

## Testing

`npm test` runs the offline unit suite with no network access. Two opt-in
integration tiers (a read-only parity check against a live RPC, and a local
`anvil` fork that exercises real write and user-operation flows) are documented in
[tests/README.md](tests/README.md).

## License

MIT. See [LICENSE](LICENSE).
