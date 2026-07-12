# logic

Free functions that carry out the actual contract interactions. This is where the
work happens: encoding call data, sending user operations or transactions, reading
state, computing counterfactual addresses, and normalising signatures.

The interface wrappers in [../interface/](../interface/) and
[../admin/interface/](../admin/interface/) call into these functions and add no
logic of their own.

Layout:

- One file per contract for the mobile user-operation path, for example
  [deviceWallet.ts](deviceWallet.ts) and [eSIMWallet.ts](eSIMWallet.ts).
- [admin/](admin/) holds the EOA equivalents used by `KokioAdmin`; each function
  sends a direct transaction with the admin or owner account.
- [account-kit/createSmartAccount.ts](account-kit/createSmartAccount.ts) builds the
  ERC-4337 smart account and its client, and handles the passkey signing envelope.
- [constants.ts](constants.ts) resolves chain-specific addresses and custom errors.
- [errors.ts](errors.ts) defines the typed error surface and revert decoding.
- [utils.ts](utils.ts) holds small shared helpers.

Functions here are prefixed with `_` to mark them as internal. Consumers reach
them through the entry classes, not directly.
