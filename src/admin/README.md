# admin

The backend (EOA) surface of the SDK. [config-admin.ts](config-admin.ts) defines
`KokioAdmin`, imported by consumers as `kokio-sdk/admin`.

It exposes only the contract functions that are restricted on chain to the admin
or owner EOA (`onlyAdmin`, `onlyOwner`, `onlyESIMWalletAdmin`). A device-wallet
user operation can never satisfy those checks, so they belong here rather than on
the mobile `Kokio` surface.

`KokioAdmin` needs only a viem `WalletClient` carrying the admin account. No
bundler, paymaster, or passkey is involved, and every method sends an ordinary
transaction.

- [interface/](interface/) holds the thin SubPackage wrappers, one per contract
  group, mirroring the layout of the mobile [../interface/](../interface/).
- The wrappers forward to the EOA logic functions in
  [../logic/admin/](../logic/admin/).

Instance-scoped surfaces (`deviceWallet`, `eSIMWallet`) can be bound after
construction with `setDeviceWalletAddress` / `setESIMWalletAddress`, since the
backend usually learns those addresses only after deploying. See the root
[README](../../README.md) for usage.
