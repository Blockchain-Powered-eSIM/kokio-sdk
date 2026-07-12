# admin

The backend (EOA) surface of the SDK.

[config-admin.ts](config-admin.ts) defines `KokioAdmin`, imported by consumers as
`kokio-sdk/admin`.

It exposes only the contract functions that are restricted on chain to the admin
or owner EOA (`onlyAdmin`, `onlyOwner`, `onlyESIMWalletAdmin`). A device-wallet
user operation can never satisfy those checks, so they belong here rather than on
the mobile `Kokio` surface.

`KokioAdmin` needs only a viem `WalletClient` carrying the admin account. No
bundler, paymaster, or passkey is involved, and every method sends an ordinary
transaction.

## Layout

- [interface/](interface/) holds the thin SubPackage wrappers, one per contract
  group, mirroring the layout of the mobile [../interface/](../interface/).
- The wrappers forward to the EOA logic functions in [../logic/admin/](../logic/admin/):
  the `*.eoa.ts` files for writes, and [../logic/admin/reads/](../logic/admin/reads/)
  for reads.

## Reads

Each SubPackage also exposes the contract's read-only state: the public storage
mappings/variables and `view` getters. For example:

- `registry.isDeviceWalletValid`
- `registry.eSIMWalletAdmin`
- `deviceWallet.isValidESIMWallet`
- `lazyWalletRegistry.eSIMIdentifierToDeviceIdentifier`

Reads need no EOA account. They extend the wallet client with viem `publicActions`
internally.

Array-backed mappings (`deviceIdentifierToESIMDetails`,
`eSIMIdentifiersAssociatedWithDeviceIdentifier`) expose the on-chain index-based
getter: pass an element index and iterate to read the whole list.

## Instance-scoped surfaces

`deviceWallet` and `eSIMWallet` target a specific contract instance. Bind them
after construction with `setDeviceWalletAddress` / `setESIMWalletAddress`, since
the backend usually learns those addresses only after deploying.

See the root [README](../../README.md) for usage.
