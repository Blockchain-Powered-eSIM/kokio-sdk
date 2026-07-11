# src

Source for the Kokio SDK. The code is organised in three layers so that the two
entry points can share the same underlying calls.

1. **Entry classes** hold the caller's configuration and expose the surfaces.
   - [config.ts](config.ts) defines `Kokio`, the mobile passkey surface.
   - [admin/config-admin.ts](admin/config-admin.ts) defines `KokioAdmin`, the
     backend EOA surface.
2. **Interface wrappers** are thin classes (SubPackages) that group contract
   functions and forward each call to a logic function. They hold no logic
   themselves.
   - [interface/](interface/) for the mobile surface.
   - [admin/interface/](admin/interface/) for the admin surface.
3. **Logic functions** are free functions that do the actual work with viem and
   `@aa-sdk/core` (encode call data, send user operations or transactions, read
   state). See [logic/](logic/).

Supporting files:

- [abis/](abis/) holds the contract ABIs.
- [types.ts](types.ts) and [types-export.ts](types-export.ts) hold the shared
  types (`P256Key`, `WebAuthnSignature`, `DataBundleDetails`, and others).

When adding a contract function, add the logic function first, then the interface
wrapper, then expose it on the entry class. Keep the wrappers free of logic.
