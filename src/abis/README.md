# abis

Typed contract ABIs used across the SDK. Each file exports one ABI declared with
`as const`, which lets viem infer argument and return types at compile time.

[index.ts](index.ts) re-exports all of them and is the single import point:

```ts
import { DeviceWallet, ESIMWallet } from "kokio-sdk/abis";
```

These ABIs mirror the deployed contracts in the `smart-contract-suite`, which is
the single source of truth. When a contract changes there, update the matching
ABI here to keep encoding and decoding correct.
