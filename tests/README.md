# tests

Three tiers, only the first of which runs by default.

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
- a local `anvil` fork that exercises real admin writes and a software-P-256 user
  operation with no private keys and no bundler.

Prerequisites, environment variables, and the exact commands are documented in
[integration/README.md](integration/README.md).

Shared test helpers live in [utils/](utils/): the mock client, a live client
factory, the fork lifecycle, and the test-only software P-256 signer.
