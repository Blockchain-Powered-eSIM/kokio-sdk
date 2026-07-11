# interface

Thin wrapper classes (SubPackages) for the mobile `Kokio` surface. Each class
groups the functions of one contract and forwards every call to a logic function
in [../logic/](../logic/). The wrappers hold no logic of their own, only the
client and any bound address.

One file per contract group, for example [deviceWalletClass.ts](deviceWalletClass.ts)
and [eSIMWalletClass.ts](eSIMWalletClass.ts). The entry class in
[../config.ts](../config.ts) instantiates these and assigns them to its fields.

Most of these surfaces send user operations through the smart account client, so
they exist only once a `smartAccountClient` has been supplied to `Kokio`. The
equivalent wrappers for the backend EOA surface live in
[../admin/interface/](../admin/interface/).
