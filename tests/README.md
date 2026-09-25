# tests

Four tiers, only the first of which runs by default.

## Unit tests (default)

Everything under [logic/](logic/), [interface/](interface/), and [admin/](admin/)
runs offline with no network access, using the mock client in
[utils/mockClient.ts](utils/mockClient.ts). This is what `npm test` runs, and it is
the suite CI relies on.

```sh
npm test
```

## Integration tests (opt-in)

The [integration/](integration/) folder holds two opt-in tiers that are skipped
unless explicitly enabled, so `npm test` stays offline and green:

- a read-only parity check that reads a live Base Sepolia deployment, and
- a local `anvil` fork that exercises real admin writes, ERC-1271 signatures and lazy deployment, with no private keys and no bundler.

Prerequisites, environment variables, and the exact commands are documented in
[integration/README.md](integration/README.md).

## Consumer tests (opt-in)

The [consumer/](consumer/) folder uses the SDK the way an app or backend would: it imports `kokio-sdk` by package name from the built `dist/`, never from `src/`. Only the passkey prompt is replaced, by a software signer.

- `*.fork.test.ts` runs the whole user journey on an anvil fork of Base Sepolia, through a local Alto bundler and mock paymaster: deploy a device wallet, register it, deploy and bind an eSIM wallet, grant and revoke access, buy with `USDC` and `USDCt`, and the refusals. Every user operation must be sponsored. Needs Foundry's `anvil`.
- `lazyWalletDeploy.fork.test.ts` covers a user who bought 88 bundles by card or external wallet before installing the app. The backend deploys the device wallet and 20 eSIM wallets, copies each eSIM's history in, and checks every entry. The user then buys 2 more eSIMs and moves two eSIMs to another device, one of them the lazy eSIM with the longest history. Fork only for now.
- `*.live.test.ts` runs the same journey on Base Sepolia with Pimlico. It sends real testnet transactions and reads `BASE_SEPOLIA_RPC_URL`, `PIMLICO_API_SECRET` and `ESIM_WALLET_ADMIN_PK` (the registry's eSIM wallet admin) from `.env`. `PIMLICO_POLICY_ID` is optional. The admin account needs a little ETH and at least 1 USDCt.

```sh
npm run test:consumer:fork
npm run test:consumer:live
```

Test data carries the `kokio-sdk-test` tag, so it is easy to tell apart from other activity on Base Sepolia.

Shared test helpers live in [utils/](utils/): the mock client, a live client
factory, the fork lifecycle, and the test-only software P-256 signer.
