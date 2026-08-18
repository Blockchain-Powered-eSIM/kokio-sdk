import { Chain, Hex, PublicActions, Transport } from "viem";
import type { BundlerClient, SmartAccount } from "viem/account-abstraction";

export type P256Key = [Hex, Hex];

/** The device wallet, as an ERC-4337 account on EntryPoint v0.8. */
export type KokioSmartAccount = SmartAccount;

/**
 * Sends user operations and reads contracts through one client. viem's bundler
 * client carries no public actions, so the SDK adds them.
 */
export type KokioSmartAccountClient =
    BundlerClient<Transport, Chain, SmartAccount> & PublicActions<Transport, Chain>;

export type WebAuthnSignature = {
    authenticatorData: Hex,
    clientDataJSON: string,
    challengeIndex: bigint,
    typeIndex: bigint,
    r: bigint,
    s: bigint  
}

export type P256Credential = {
    rawId: Hex;
    clientData: {
      type: string;
      challenge: string;
      origin: string;
      crossOrigin: boolean;
    };
    authenticatorData: Hex;
    signature: {r: Hex, s: Hex};
};

export type DataBundleDetails = {
    // Field name must match the on-chain `DataBundleDetails` struct
    // (ESIMWallet.sol) - viem's `as const` ABIs encode by exact key.
    dataBundleID: string;
    dataBundlePrice: bigint;
}

export type SignedRequest = {
    body: string;
    stamp : {
        stampHeader: string;
        stampHeaderValue: string;
    }
    url: string;
}
