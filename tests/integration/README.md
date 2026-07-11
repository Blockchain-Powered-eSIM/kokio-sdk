# Integration tests

Two opt-in tiers that never run under `npm test` (the default suite stays fully
offline and green). Both are skipped unless explicitly enabled.

## Read-only parity tier — `baseSepolia.integration.test.ts`

Reads the live Base Sepolia deployment and checks the SDK's resolved constants,
counterfactual addresses, and view calls against the real contracts. Gated by
`hasRpc()` — runs only when `BASE_SEPOLIA_RPC_URL` is set.

```sh
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org npm run test:integration
```

No keys or funds — read access only.

## Write / UserOp scenario tier — local Base Sepolia fork

`adminFork.integration.test.ts` and `userOpFork.integration.test.ts` drive real
state-changing flows against a local [`anvil`](https://book.getfoundry.sh/anvil/)
fork of Base Sepolia. **No private keys and no bundler** are required:

- The fork carries the real deployed contracts and reports chain id `84532`, so
  the SDK resolves the Base Sepolia factory addresses and runs unmodified.
- Admin-gated writes work by **impersonating** the real on-chain
  `eSIMWalletAdmin` (anvil `impersonateAccount` + `setBalance`).
- UserOps are submitted by a funded anvil account calling
  `EntryPoint.handleOps` directly — no Pimlico, no gas policy.
- The passkey signature is produced by a **software** P-256 signer
  (`tests/utils/softP256Signer.ts`, test-only) that assembles the same
  `WebAuthnSignature` envelope the native passkey path produces and feeds it
  through the SDK's real `_encodeSignature`.

### Prerequisites

- Foundry installed (`anvil` on `PATH`). Install via
  [`foundryup`](https://book.getfoundry.sh/getting-started/installation).
- `INTEGRATION=1` (the script sets it). Without Foundry or the flag, the tier
  `skipIf`-skips cleanly.

### Run

```sh
npm run test:integration:fork
```

The fork pulls upstream state from `BASE_SEPOLIA_RPC_URL` if set, otherwise the
public `https://sepolia.base.org`. Set `ANVIL_BIN` to point at a specific `anvil`
binary when a newer Foundry lives outside `PATH` (e.g. `~/.foundry/bin/anvil`).

The tier runs with `--no-file-parallelism` so the two forks don't fetch upstream
state concurrently (which can rate-limit the public endpoint).
