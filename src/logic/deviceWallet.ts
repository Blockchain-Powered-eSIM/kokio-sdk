import { Address, encodeFunctionData, getContract, Hex, WalletClient } from "viem";
import { Call, KokioSmartAccountClient } from "../types.js";
import { DeviceWallet } from "../abis/index.js";
import { MissingSmartWalletError } from "./errors.js";
import { P256Key } from "../types.js";

// A userOp from a device wallet runs through `execute`, so at the target contract
// msg.sender is the device-wallet account itself. That constrains which DeviceWallet
// functions this surface can expose:
//   - deployESIMWallet is `onlyESIMWalletAdmin` - only the admin EOA may call, so a
//     device-wallet userOp always reverts. It is exposed on `KokioAdmin.deviceWallet`.
//   - pullETH is `onlyAssociatedESIMWallets` - callable only by an associated eSIM
//     wallet contract, never by the device wallet or an EOA. An eSIM wallet reaches it
//     on its own during `buyDataBundle`.
//   - execute and executeBatch are what a userOp runs through, so the smart account
//     client already uses them; calling one directly would nest a userOp inside a userOp.
//     `_sendUserOperation` below is the generic entry point instead: it hands the smart
//     account client raw calls, and the account's own `encodeCalls` is what turns those
//     into `execute` or `executeBatch`, never this file.
//   - init runs at deploy, and validateUserOp is `onlyEntryPoint`.
// The functions below are self-callable (target = the device wallet's own address, so
// msg.sender == self), so they succeed via a userOp.

/**
 * Send one or more calls from this device wallet as a single user operation.
 * The only escape hatch on this surface for anything not named below: sending
 * ETH to any address, calling another contract, moving tokens, interacting
 * with a DeFi protocol. A lone call encodes to `execute`, several batch
 * atomically through `executeBatch`.
 */
export const _sendUserOperation = async (client: KokioSmartAccountClient, calls: Call[]) => {

    if(!client.account) throw new MissingSmartWalletError();

    return client.sendUserOperation({
        account: client.account,
        calls
    });
}

export const _toggleAccessToETH = async (client: KokioSmartAccountClient, address: Address, eSIMWalletAddress: Address, hasAccessToETH: boolean) => {

    if(!client.account) throw new MissingSmartWalletError();

    // UserOp - `onlySelf`; the device wallet toggles ETH access for an eSIM wallet it owns.
    return client.sendUserOperation({
        account: client.account,
        calls: [{
            to: address,
            data: encodeFunctionData({
                abi: DeviceWallet,
                functionName: "toggleAccessToETH",
                args: [eSIMWalletAddress, hasAccessToETH]
            })
        }]
    });
}

/**
 * Bind an eSIM wallet this device wallet already owns.
 *
 * A bind never carries ETH access: the contract reverts on a `true` rather than
 * downgrading it quietly, so the SDK passes `false` and there is nothing to
 * choose. `toggleAccessToETH` is the only way to grant it, which is what stops a
 * bind from undoing the owner's revocation.
 */
export const _addESIMWallet = async (client: KokioSmartAccountClient, address: Address, eSIMWalletAddress: Address) => {

    if(!client.account) throw new MissingSmartWalletError();

    // UserOp - `onlyRegistryOrDeviceWalletFactoryOrOwner`; self is permitted.
    return client.sendUserOperation({
        account: client.account,
        calls: [{
            to: address,
            data: encodeFunctionData({
                abi: DeviceWallet,
                functionName: "addESIMWallet",
                args: [eSIMWalletAddress, false]
            })
        }]
    });
}

/**
 * Release an eSIM wallet and put it on standby for a transfer.
 *
 * `callBackETH` sweeps whatever ETH the eSIM wallet still holds back here. It
 * runs after the release, so a wallet whose handler misbehaves has already lost
 * its ETH access and its registry association. A failed sweep is swallowed by
 * the contract, so a `true` is not a promise that anything arrived.
 */
export const _removeESIMWallet = async (client: KokioSmartAccountClient, address: Address, eSIMWalletAddress: Address, callBackETH: boolean) => {

    if(!client.account) throw new MissingSmartWalletError();

    // UserOp - `onlySelfOrAssociatedESIMWallet`; self is permitted.
    return client.sendUserOperation({
        account: client.account,
        calls: [{
            to: address,
            data: encodeFunctionData({
                abi: DeviceWallet,
                functionName: "removeESIMWallet",
                args: [eSIMWalletAddress, callBackETH]
            })
        }]
    });
}

/**
 * Rotate the P256 key that owns this wallet. The registry is told in the same
 * call, so its record of the owner cannot drift from the wallet's.
 *
 * A key that cannot produce a verifiable signature bricks the wallet: this is
 * reachable only through a signed userOp, so there is no rotating back and no
 * reaching the balance afterwards. The contract rejects a key it can tell is
 * unusable, but check the new key can sign before calling.
 */
export const _transferOwnership = async (client: KokioSmartAccountClient, address: Address, newOwner: P256Key) => {

    if(!client.account) throw new MissingSmartWalletError();

    // UserOp - `onlySelf`.
    return client.sendUserOperation({
        account: client.account,
        calls: [{
            to: address,
            data: encodeFunctionData({
                abi: DeviceWallet,
                functionName: "transferOwnership",
                args: [newOwner]
            })
        }]
    });
}

/**
 * Top up the gas deposit the EntryPoint holds for this wallet, from the wallet's
 * own balance. Anyone may pay into any account's deposit, so an EOA can do this
 * with a plain transfer too and not spend a userOp on it.
 */
export const _addDeposit = async (client: KokioSmartAccountClient, address: Address, amount: bigint) => {

    if(!client.account) throw new MissingSmartWalletError();

    return client.sendUserOperation({
        account: client.account,
        calls: [{
            to: address,
            value: amount,
            data: encodeFunctionData({
                abi: DeviceWallet,
                functionName: "addDeposit",
                args: []
            })
        }]
    });
}

/** Pull part of the EntryPoint gas deposit back out to any address. */
export const _withdrawDepositTo = async (client: KokioSmartAccountClient, address: Address, withdrawAddress: Address, amount: bigint) => {

    if(!client.account) throw new MissingSmartWalletError();

    // UserOp - `onlySelf`.
    return client.sendUserOperation({
        account: client.account,
        calls: [{
            to: address,
            data: encodeFunctionData({
                abi: DeviceWallet,
                functionName: "withdrawDepositTo",
                args: [withdrawAddress, amount]
            })
        }]
    });
}

// `getVaultAddress` is a `view` - read it directly instead of spending a userOp.
export const _getVaultAddress = async (client: KokioSmartAccountClient, address: Address): Promise<Address> => {
    return client.readContract({
        address,
        abi: DeviceWallet,
        functionName: "getVaultAddress",
        args: []
    }) as Promise<Address>;
}

/** Gas this wallet has on deposit at the EntryPoint. */
export const _getDeposit = async (client: KokioSmartAccountClient, address: Address): Promise<bigint> => {
    return client.readContract({
        address,
        abi: DeviceWallet,
        functionName: "getDeposit",
        args: []
    }) as Promise<bigint>;
}

/** The device identifier this wallet was deployed for. Set once, at deploy. */
export const _deviceUniqueIdentifier = async (client: KokioSmartAccountClient, address: Address): Promise<string> => {
    return client.readContract({
        address,
        abi: DeviceWallet,
        functionName: "deviceUniqueIdentifier",
        args: []
    }) as Promise<string>;
}

/** Whether this wallet currently holds the given eSIM wallet. */
export const _isValidESIMWallet = async (client: KokioSmartAccountClient, address: Address, eSIMWalletAddress: Address): Promise<boolean> => {
    return client.readContract({
        address,
        abi: DeviceWallet,
        functionName: "isValidESIMWallet",
        args: [eSIMWalletAddress]
    }) as Promise<boolean>;
}

/**
 * Whether an eSIM wallet may pull ETH from this one. Binding a wallet never
 * grants it, so this stays false until `toggleAccessToETH` says otherwise.
 */
export const _canPullETH = async (client: KokioSmartAccountClient, address: Address, eSIMWalletAddress: Address): Promise<boolean> => {
    return client.readContract({
        address,
        abi: DeviceWallet,
        functionName: "canPullETH",
        args: [eSIMWalletAddress]
    }) as Promise<boolean>;
}

/**
 * Check a signature over an arbitrary message, per ERC-1271. Returns
 * `0x1626ba7e` when the signature is valid and unexpired, `0xffffffff` otherwise.
 *
 * The signature is a version byte, then six bytes of `validUntil`, then the
 * ABI-encoded WebAuthn assertion. What was signed is not `messageHash` itself but
 * an EIP-191 digest over version, validUntil, chain id, this wallet's address and
 * `messageHash`, so a signature cannot be replayed on another chain or against
 * the same owner key's wallet at a different salt.
 */
export const _isValidSignature = async (client: KokioSmartAccountClient, address: Address, messageHash: Hex, signature: Hex): Promise<Hex> => {
    return client.readContract({
        address,
        abi: DeviceWallet,
        functionName: "isValidSignature",
        args: [messageHash, signature]
    }) as Promise<Hex>;
}

/** The registry this wallet reports its ownership changes to. */
export const _registry = async (client: KokioSmartAccountClient, address: Address): Promise<Address> => {
    return client.readContract({
        address,
        abi: DeviceWallet,
        functionName: "registry",
        args: []
    }) as Promise<Address>;
}

/** The factory that deploys this wallet's eSIM wallets. */
export const _eSIMWalletFactory = async (client: KokioSmartAccountClient, address: Address): Promise<Address> => {
    return client.readContract({
        address,
        abi: DeviceWallet,
        functionName: "eSIMWalletFactory",
        args: []
    }) as Promise<Address>;
}

/** The ERC-4337 EntryPoint this wallet answers to. Immutable. */
export const _entryPoint = async (client: KokioSmartAccountClient, address: Address): Promise<Address> => {
    return client.readContract({
        address,
        abi: DeviceWallet,
        functionName: "entryPoint",
        args: []
    }) as Promise<Address>;
}

/** The P256 verifier used when the RIP-7212 precompile is unavailable. */
export const _verifier = async (client: KokioSmartAccountClient, address: Address): Promise<Address> => {
    return client.readContract({
        address,
        abi: DeviceWallet,
        functionName: "verifier",
        args: []
    }) as Promise<Address>;
}

export const _getOwner = async (client: WalletClient, address: Address) => {

    const contract = getContract({
        abi: DeviceWallet,
        address: address,
        client
    })

    const x = await contract.read.owner([0n]);
    const y = await contract.read.owner([1n]);

    const owner: P256Key = [x, y];
    return owner;
}
