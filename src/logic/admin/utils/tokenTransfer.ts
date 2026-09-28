import {
    Address,
    BaseError,
    ContractFunctionRevertedError,
    ContractFunctionZeroDataError,
    AbiDecodingDataSizeTooSmallError,
    AbiDecodingZeroDataError,
    Hash,
    Hex,
    TransactionReceipt,
    TransactionReceiptNotFoundError,
    WalletClient,
    erc20Abi,
    isAddress,
    isAddressEqual,
    isHash,
    parseEventLogs,
    publicActions,
    stringToHex,
    zeroAddress,
} from "viem";
import { _chainId, _getChainSpecificConstants } from "../../constants.js";
import { ESIMWallet, PaymentAdapter, Registry } from "../../../abis/index.js";
import {
    InvalidAddressError,
    InvalidSymbolError,
    NotAProtocolESIMWalletError,
    NotAnERC20TokenError,
    PriceOutOfRangeError,
    ReceiptNotCanonicalError,
    TokenNotAcceptedError,
    TransactionRevertedError,
    UnknownTransactionError,
    UnmatchedPaymentEventsError,
} from "../../errors.js";
import { ERC20TransferCheck, Finality, ProtocolPaymentCheck } from "../../../types.js";

// The contracts price everything in uint64 cents.
const MAX_UINT64 = 2n ** 64n - 1n;

const _checkAddress = (what: string, value: string): Address => {
    if (!isAddress(value)) throw new InvalidAddressError(what, value, "is not a valid address");
    if (isAddressEqual(value, zeroAddress)) throw new InvalidAddressError(what, value, "is the zero address");
    return value;
}

// Same bytes as Solidity's `bytes32("USDC")`: the text on the left, zeros after.
const _symbolToBytes32 = (symbol: string): Hex => {
    if (!symbol) throw new InvalidSymbolError(symbol);
    try {
        return stringToHex(symbol, { size: 32 });
    } catch {
        throw new InvalidSymbolError(symbol);
    }
}

const _checkTransaction = (transaction: Hash | TransactionReceipt) => {
    if (typeof transaction === "string" && !isHash(transaction)) throw new UnknownTransactionError(transaction);
}

// A receipt passed in is used as given, so it must come from the caller's own node.
const _receipt = async (client: WalletClient, transaction: Hash | TransactionReceipt): Promise<TransactionReceipt> => {
    let receipt = transaction as TransactionReceipt;
    if (typeof transaction === "string") {
        try {
            receipt = await client.extend(publicActions).getTransactionReceipt({ hash: transaction });
        } catch (err) {
            if (err instanceof TransactionReceiptNotFoundError) throw new UnknownTransactionError(transaction);
            throw err;
        }
    }
    if (receipt.status !== "success") throw new TransactionRevertedError(receipt.transactionHash);
    return receipt;
}

// The receipt plus how far its block has settled, read alongside it. A receipt passed in
// is also checked against the chain's block at its height, since it may be from a block
// since reorged out. One fetched by hash comes from the chain as it is now.
const _receiptWithFinality = async (client: WalletClient, transaction: Hash | TransactionReceipt) => {
    const publicClient = client.extend(publicActions);
    const given = typeof transaction === "string" ? undefined : transaction;

    const [receipt, safe, finalized, canonical] = await Promise.all([
        _receipt(client, transaction),
        publicClient.getBlock({ blockTag: "safe" }),
        publicClient.getBlock({ blockTag: "finalized" }),
        given && publicClient.getBlock({ blockNumber: given.blockNumber }),
    ]);

    if (canonical && canonical.hash !== receipt.blockHash) {
        throw new ReceiptNotCanonicalError(receipt.transactionHash, receipt.blockHash);
    }

    const finality: Finality = receipt.blockNumber <= finalized.number ? "finalized"
        : receipt.blockNumber <= safe.number ? "safe"
        : "latest";

    return { receipt, landed: { finality, blockNumber: receipt.blockNumber, blockHash: receipt.blockHash } };
}

/**
 * Every purchase `eSIMWallet` paid for in `symbol` within one transaction, read
 * from the payment adapter's `PaymentSettled` and the eSIM wallet's
 * `DataBundleBoughtWithToken`. Cents and references are the contracts' own.
 */
export const _verifyProtocolPayment = async (
    client: WalletClient,
    transaction: Hash | TransactionReceipt,
    symbol: string,
    eSIMWallet: Address,
): Promise<ProtocolPaymentCheck> => {
    const wallet = _checkAddress("eSIM wallet", eSIMWallet);
    const asset = _symbolToBytes32(symbol);
    _checkTransaction(transaction);

    const publicClient = client.extend(publicActions);
    const reads = async () => {
        const F = _getChainSpecificConstants(await _chainId(client), client.transport.url).factoryAddresses;
        const [deviceWallet, entry] = await Promise.all([
            publicClient.readContract({ address: F.REGISTRY, abi: Registry, functionName: "isESIMWalletValid", args: [wallet] }),
            publicClient.readContract({ address: F.PAYMENT_ADAPTER, abi: PaymentAdapter, functionName: "assets", args: [asset] }),
        ]);
        return { adapter: F.PAYMENT_ADAPTER, deviceWallet, entry };
    };

    const [{ receipt, landed }, { adapter, deviceWallet, entry: [, , decimals, token] }] = await Promise.all([
        _receiptWithFinality(client, transaction),
        reads(),
    ]);

    if (deviceWallet === zeroAddress) throw new NotAProtocolESIMWalletError(wallet);
    // A registered symbol always has non-zero decimals, even once withdrawn.
    if (decimals === 0) throw new TokenNotAcceptedError(symbol, "NOT_REGISTERED");
    if (token === zeroAddress) throw new TokenNotAcceptedError(symbol, "NOT_ONCHAIN");

    // Filtered on the emitting address, so a look-alike event from any other contract is ignored.
    const settled = parseEventLogs({ abi: PaymentAdapter, eventName: "PaymentSettled", logs: receipt.logs })
        .filter((log) => isAddressEqual(log.address, adapter) && log.args._symbol === asset && isAddressEqual(log.args._eSIMWallet, wallet));
    const bought = parseEventLogs({ abi: ESIMWallet, eventName: "DataBundleBoughtWithToken", logs: receipt.logs })
        .filter((log) => isAddressEqual(log.address, wallet) && log.args._asset === asset);

    // The adapter settles first and the wallet emits after, once per purchase.
    if (settled.length !== bought.length) throw new UnmatchedPaymentEventsError(receipt.transactionHash);
    const payments = settled.map((s, i) => {
        const b = bought[i];
        if (s.logIndex > b.logIndex || s.args._priceUSDCents !== b.args._priceUSDCents || s.args._spent !== b.args._amountSpent) {
            throw new UnmatchedPaymentEventsError(receipt.transactionHash);
        }
        return {
            paymentReference: b.args._paymentReference,
            dataBundleId: b.args._dataBundleID,
            priceUSDCents: b.args._priceUSDCents,
            amountSpent: b.args._amountSpent,
            vault: s.args._vault,
        };
    });

    return { priceUSDCents: payments.reduce((sum, p) => sum + p.priceUSDCents, 0n), payments, ...landed };
}

// A revert or an empty answer means the address is not an ERC-20. Anything else, like a
// network failure, is passed on as-is.
const _erc20Read = <T>(read: Promise<T>, token: Address): Promise<T> => read.catch((err) => {
    const notAToken = err instanceof BaseError && err.walk((e) =>
        e instanceof ContractFunctionRevertedError ||
        e instanceof ContractFunctionZeroDataError ||
        e instanceof AbiDecodingZeroDataError ||
        e instanceof AbiDecodingDataSizeTooSmallError);
    throw notAToken ? new NotAnERC20TokenError(token) : err;
});

/**
 * What `sender` sent `destination` directly in `token` within one transaction.
 * Cents treat one token as one dollar, the way the payment adapter prices a
 * dollar currency, so they mean nothing for a token that is not.
 */
export const _verifyERC20Transfer = async (
    client: WalletClient,
    transaction: Hash | TransactionReceipt,
    token: Address,
    sender: Address,
    destination: Address,
): Promise<ERC20TransferCheck> => {
    const tokenAddress = _checkAddress("Token", token);
    const from = _checkAddress("Sender", sender);
    const to = _checkAddress("Destination", destination);
    if (isAddressEqual(from, to)) throw new InvalidAddressError("Destination", to, "is the same as the sender");
    _checkTransaction(transaction);

    const publicClient = client.extend(publicActions);

    // decimals() is what an ERC-721 lacks, and an address with no code answers neither.
    const [{ receipt, landed }, decimals] = await Promise.all([
        _receiptWithFinality(client, transaction),
        _erc20Read(publicClient.readContract({ address: tokenAddress, abi: erc20Abi, functionName: "decimals" }), tokenAddress),
        _erc20Read(publicClient.readContract({ address: tokenAddress, abi: erc20Abi, functionName: "totalSupply" }), tokenAddress),
    ]);

    // Strict parsing skips an ERC-721 Transfer, whose third topic is the token id.
    const amount = parseEventLogs({ abi: erc20Abi, eventName: "Transfer", logs: receipt.logs })
        .filter((log) => isAddressEqual(log.address, tokenAddress) && isAddressEqual(log.args.from, from) && isAddressEqual(log.args.to, to))
        .reduce((sum, log) => sum + log.args.value, 0n);

    // amount * 100 / 10^decimals, without the large intermediate.
    const priceUSDCents = decimals >= 2
        ? amount / 10n ** BigInt(decimals - 2)
        : amount * 10n ** BigInt(2 - decimals);
    if (priceUSDCents > MAX_UINT64) throw new PriceOutOfRangeError(priceUSDCents);

    return { priceUSDCents, amount, ...landed };
}
