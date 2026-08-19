# Kokio SDK reference

Function-by-function reference for every surface the SDK exposes. For
installation and a quick start, see the [root README](../README.md).

Each page covers one contract group: how to reach it, and every method on it
with a short description, a code example, and what it returns.

## Mobile (`Kokio`, from `kokio-sdk`)

The passkey-signed surface used by the mobile app. Every write here sends a
user operation through the smart account client.

- [Smart account](mobile/smart-account.md), `kokio.smartAccount`. Resolve and
  connect to a device's smart account.
- [Device wallet](mobile/device-wallet.md), `kokio.deviceWallet`. Manage the
  device wallet a user owns.
- [Device wallet factory](mobile/device-wallet-factory.md),
  `kokio.deviceWalletFactory`. Read-only lookups for deploying device wallets.
- [eSIM wallet](mobile/esim-wallet.md), `kokio.eSIMWallet`. Buy data bundles
  and manage one eSIM wallet.
- [eSIM wallet factory](mobile/esim-wallet-factory.md),
  `kokio.eSIMWalletFactory`. Deploy a new eSIM wallet.
- [Registry](mobile/registry.md), `kokio.registry`. Bind eSIM wallets and read
  protocol-wide state.
- [P256 verifier](mobile/p256-verifier.md), `kokio.P256Verifier`. Check a
  WebAuthn signature directly.

## Backend (`KokioAdmin`, from `kokio-sdk/admin`)

The EOA-signed surface used by the backend server. Every write here sends an
ordinary transaction, no bundler or passkey involved.

- [Device wallet](admin/device-wallet.md), `admin.deviceWallet`. Deploy eSIM
  wallets for a device and read its state.
- [Device wallet factory](admin/device-wallet-factory.md),
  `admin.deviceWalletFactory`. Deploy device wallets on a user's behalf.
- [eSIM wallet](admin/esim-wallet.md), `admin.eSIMWallet`. Buy a data bundle
  as the eSIM wallet admin.
- [eSIM wallet factory](admin/esim-wallet-factory.md),
  `admin.eSIMWalletFactory`. Manage the eSIM wallet implementation.
- [Registry](admin/registry.md), `admin.registry`. Protocol admin actions:
  pause, price caps, admin handover, and every read.
- [Lazy wallet registry](admin/lazy-wallet-registry.md),
  `admin.lazyWalletRegistry`. Deploy wallets for users who bought eSIMs before
  they had one, and copy their purchase history in.
- [Protocol admin](admin/protocol-admin.md), `admin.protocolAdmin`. The
  timelock that owns the contracts above. Schedule, execute, and cancel
  delayed admin calls.

## Reading a page

Every method entry follows the same shape:

- **What it does and when to use it**, in plain terms.
- **A code example** with real-looking values, not placeholders.
- **What it returns.**

A write (anything that changes state) either sends a user operation (mobile)
or a transaction (admin) and resolves to a hash. A read is a plain `view` call
and resolves to the value itself.
