import { describe, it, expect } from "vitest";
import {
  type Abi,
  type Address,
  type Hex,
  ContractFunctionZeroDataError,
  HttpRequestError,
  TransactionReceiptNotFoundError,
  encodeAbiParameters,
  encodeEventTopics,
  erc20Abi,
  getAddress,
  parseAbi,
  stringToHex,
  zeroAddress,
} from "viem";

import { makeMockWalletClient } from "../../utils/mockClient.js";
import { baseSepoliaFactoryAddresses } from "../../../src/logic/constants.js";
import { ESIMWallet, PaymentAdapter } from "../../../src/abis/index.js";
import { _verifyERC20Transfer, _verifyProtocolPayment } from "../../../src/logic/admin/utils/tokenTransfer.js";
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
} from "../../../src/logic/errors.js";

// --- Fixtures ---------------------------------------------------------------
const F = baseSepoliaFactoryAddresses;
const CHAIN_ID = 84532;
const HASH = "0x00000000000000000000000000000000000000000000000000000000000000a1" as Hex;

const ESIM = "0x00000000000000000000000000000000000e51a1" as Address;
const OTHER_ESIM = "0x00000000000000000000000000000000000e51a2" as Address;
const DEVICE = "0x00000000000000000000000000000000000dead1" as Address;
// Checksummed, the way viem decodes an address out of an event.
const VAULT = getAddress("0x000000000000000000000000000000000000a017");
const TOKEN = "0x0000000000000000000000000000000000706b31" as Address;
const SENDER = "0x0000000000000000000000000000000000005e0d" as Address;
const DESTINATION = "0x000000000000000000000000000000000000de57" as Address;
const STRANGER = "0x0000000000000000000000000000000000000bad" as Address;

const SYMBOL = "USDCt";
const ASSET = stringToHex(SYMBOL, { size: 32 });
const REF_1 = stringToHex("order-1", { size: 32 });
const REF_2 = stringToHex("order-2", { size: 32 });
const BUNDLE = stringToHex("bundle", { size: 32 });

const erc721Abi = parseAbi(["event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"]);

// Encodes a real log, so the SDK's parsing runs exactly as it does against a node.
let logIndex = 0;
const log = (address: Address, abi: Abi, eventName: string, args: Record<string, unknown>) => {
  const event = abi.find((item) => item.type === "event" && item.name === eventName) as { inputs: { name: string; type: string; indexed?: boolean }[] };
  const nonIndexed = event.inputs.filter((input) => !input.indexed);
  return {
    address,
    topics: encodeEventTopics({ abi, eventName, args } as never),
    data: encodeAbiParameters(nonIndexed, nonIndexed.map((input) => args[input.name])),
    logIndex: logIndex++,
    blockHash: HASH, blockNumber: 1n, transactionHash: HASH, transactionIndex: 0, removed: false,
  };
};

// Every receipt lands in block 100. The chain below has it finalized unless a test says otherwise.
const BLOCK = 100n;
const BLOCK_HASH = "0x00000000000000000000000000000000000000000000000000000000000b0c64" as Hex;
const LANDED = { finality: "finalized", blockNumber: BLOCK, blockHash: BLOCK_HASH } as const;

const receipt = (logs: unknown[], status = "success") =>
  ({ status, transactionHash: HASH, blockNumber: BLOCK, blockHash: BLOCK_HASH, logs }) as never;

type Chain = { safe: bigint; finalized: bigint; hashAt?: Hex };
const chainReads = ({ safe, finalized, hashAt = BLOCK_HASH }: Chain) =>
  ({ blockTag, blockNumber }: { blockTag?: string; blockNumber?: bigint }) => {
    if (blockTag === "safe") return { number: safe };
    if (blockTag === "finalized") return { number: finalized };
    return { number: blockNumber, hash: hashAt };
  };
const FINAL_CHAIN: Chain = { safe: 190n, finalized: 150n };

// One protocol purchase: the adapter settles, then the eSIM wallet records it.
const purchase = (opts: { wallet?: Address; asset?: Hex; ref?: Hex; cents?: bigint; spent?: bigint } = {}) => {
  const { wallet = ESIM, asset = ASSET, ref = REF_1, cents = 500n, spent = cents * 10_000n } = opts;
  return [
    log(F.PAYMENT_ADAPTER, PaymentAdapter, "PaymentSettled", {
      _symbol: asset, _eSIMWallet: wallet, _vault: VAULT, _priceUSDCents: cents, _spent: spent, _refunded: 0n,
    }),
    log(wallet, ESIMWallet, "DataBundleBoughtWithToken", {
      _dataBundleID: BUNDLE, _priceUSDCents: cents, _asset: asset, _token: TOKEN, _amountSpent: spent, _paymentReference: ref,
    }),
  ];
};

const transfer = (token: Address, from: Address, to: Address, value: bigint) =>
  log(token, erc20Abi, "Transfer", { from, to, value });

const protocolClient = (reads: Record<string, unknown> = {}, getReceipt?: () => unknown, chain = FINAL_CHAIN) => makeMockWalletClient({
  chainId: CHAIN_ID,
  reads: { isESIMWalletValid: DEVICE, assets: [true, true, 6, TOKEN], ...reads },
  getReceipt,
  getBlock: chainReads(chain),
});

const erc20Client = (reads: Record<string, unknown> = {}, getReceipt?: () => unknown, chain = FINAL_CHAIN) => makeMockWalletClient({
  chainId: CHAIN_ID,
  reads: { decimals: 6, totalSupply: 1_000_000n, ...reads },
  getReceipt,
  getBlock: chainReads(chain),
});

// --- verifyProtocolPayment ---------------------------------------------------
describe("_verifyProtocolPayment", () => {
  it("returns the contracts' cents, reference and vault for one purchase", async () => {
    const result = await _verifyProtocolPayment(protocolClient(), receipt(purchase({ cents: 123_456n })), SYMBOL, ESIM);

    expect(result).toEqual({
      priceUSDCents: 123_456n,
      payments: [{ paymentReference: REF_1, dataBundleId: BUNDLE, priceUSDCents: 123_456n, amountSpent: 1_234_560_000n, vault: VAULT }],
      ...LANDED,
    });
  });

  it("passes the symbol to the adapter as the contracts' bytes32", async () => {
    const client = protocolClient();
    await _verifyProtocolPayment(client, receipt(purchase()), SYMBOL, ESIM);

    expect(client.readContract).toHaveBeenCalledWith(expect.objectContaining({
      address: F.PAYMENT_ADAPTER, functionName: "assets", args: ["0x5553444374000000000000000000000000000000000000000000000000000000"],
    }));
  });

  it("totals several purchases by the wallet and skips other wallets and currencies", async () => {
    const logs = [
      ...purchase({ ref: REF_1, cents: 500n }),
      ...purchase({ wallet: OTHER_ESIM, cents: 900n }),
      ...purchase({ asset: stringToHex("USDC", { size: 32 }), cents: 700n }),
      ...purchase({ ref: REF_2, cents: 250n }),
    ];
    const result = await _verifyProtocolPayment(protocolClient(), receipt(logs), SYMBOL, ESIM);

    expect(result.priceUSDCents).toBe(750n);
    expect(result.payments.map((p) => p.paymentReference)).toEqual([REF_1, REF_2]);
  });

  it("ignores a look-alike settlement from a contract that is not the adapter", async () => {
    const fake = log(STRANGER, PaymentAdapter, "PaymentSettled", {
      _symbol: ASSET, _eSIMWallet: ESIM, _vault: STRANGER, _priceUSDCents: 99_999n, _spent: 1n, _refunded: 0n,
    });
    const result = await _verifyProtocolPayment(protocolClient(), receipt([fake, ...purchase()]), SYMBOL, ESIM);

    expect(result.payments).toHaveLength(1);
    expect(result.payments[0].vault).toBe(VAULT);
  });

  it("answers 0 cents and no payments when the wallet bought nothing", async () => {
    const result = await _verifyProtocolPayment(protocolClient(), receipt([transfer(TOKEN, ESIM, VAULT, 5n)]), SYMBOL, ESIM);
    expect(result).toEqual({ priceUSDCents: 0n, payments: [], ...LANDED });
  });

  it("refuses events that do not pair up", async () => {
    const [settled, bought] = purchase();
    await expect(_verifyProtocolPayment(protocolClient(), receipt([settled]), SYMBOL, ESIM))
      .rejects.toBeInstanceOf(UnmatchedPaymentEventsError);
    // The wallet's event landing before the adapter's.
    const swapped = [{ ...bought, logIndex: settled.logIndex }, { ...settled, logIndex: bought.logIndex }];
    await expect(_verifyProtocolPayment(protocolClient(), receipt(swapped), SYMBOL, ESIM))
      .rejects.toBeInstanceOf(UnmatchedPaymentEventsError);

    const [, otherPrice] = purchase({ cents: 501n, spent: 5_000_000n });
    await expect(_verifyProtocolPayment(protocolClient(), receipt([settled, otherPrice]), SYMBOL, ESIM))
      .rejects.toBeInstanceOf(UnmatchedPaymentEventsError);
  });

  it("refuses an address the registry does not know as an eSIM wallet", async () => {
    await expect(_verifyProtocolPayment(protocolClient({ isESIMWalletValid: zeroAddress }), receipt(purchase()), SYMBOL, DEVICE))
      .rejects.toBeInstanceOf(NotAProtocolESIMWalletError);
  });

  it("refuses a symbol never registered, and one with no token", async () => {
    await expect(_verifyProtocolPayment(protocolClient({ assets: [false, false, 0, zeroAddress] }), receipt([]), "usdct", ESIM))
      .rejects.toThrow(expect.objectContaining({ constructor: TokenNotAcceptedError, reason: "NOT_REGISTERED" }));
    await expect(_verifyProtocolPayment(protocolClient({ assets: [true, true, 2, zeroAddress] }), receipt([]), "USD", ESIM))
      .rejects.toThrow(expect.objectContaining({ constructor: TokenNotAcceptedError, reason: "NOT_ONCHAIN" }));
  });

  it("still verifies a symbol withdrawn after the payment", async () => {
    const result = await _verifyProtocolPayment(protocolClient({ assets: [false, true, 6, TOKEN] }), receipt(purchase()), SYMBOL, ESIM);
    expect(result.payments).toHaveLength(1);
  });

  it("refuses an empty symbol and one longer than 32 bytes before any read", async () => {
    const client = protocolClient();
    await expect(_verifyProtocolPayment(client, receipt([]), "", ESIM)).rejects.toBeInstanceOf(InvalidSymbolError);
    await expect(_verifyProtocolPayment(client, receipt([]), "X".repeat(33), ESIM)).rejects.toBeInstanceOf(InvalidSymbolError);
    expect(client.readContract).not.toHaveBeenCalled();
  });

  it("refuses a malformed or zero eSIM wallet", async () => {
    await expect(_verifyProtocolPayment(protocolClient(), receipt([]), SYMBOL, "0x1234" as Address))
      .rejects.toBeInstanceOf(InvalidAddressError);
    await expect(_verifyProtocolPayment(protocolClient(), receipt([]), SYMBOL, zeroAddress))
      .rejects.toBeInstanceOf(InvalidAddressError);
  });

  it("refuses a reverted transaction", async () => {
    await expect(_verifyProtocolPayment(protocolClient(), receipt(purchase(), "reverted"), SYMBOL, ESIM))
      .rejects.toBeInstanceOf(TransactionRevertedError);
  });

  it("looks a hash up, and sends every read before the receipt answers", async () => {
    let answer!: (value: unknown) => void;
    const client = protocolClient({}, () => new Promise((resolve) => { answer = resolve; }));
    const pending = _verifyProtocolPayment(client, HASH, SYMBOL, ESIM);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(client.readContract).toHaveBeenCalledTimes(2);
    answer(receipt(purchase()));

    expect((await pending).payments).toHaveLength(1);
  });

  it("reports a hash with no mined transaction, and a malformed hash without asking the node", async () => {
    const client = protocolClient({}, () => { throw new TransactionReceiptNotFoundError({ hash: HASH }); });
    await expect(_verifyProtocolPayment(client, HASH, SYMBOL, ESIM)).rejects.toBeInstanceOf(UnknownTransactionError);

    const untouched = protocolClient();
    await expect(_verifyProtocolPayment(untouched, "0x1234" as Hex, SYMBOL, ESIM)).rejects.toBeInstanceOf(UnknownTransactionError);
    expect(untouched.readContract).not.toHaveBeenCalled();
  });
});

// --- Finality, for both checks -----------------------------------------------
describe("how far the transaction's block has settled", () => {
  const checks = [
    // Each check is given a receipt, or a hash when one is passed.
    ["_verifyProtocolPayment", (chain: Chain, hash?: Hex) =>
      _verifyProtocolPayment(protocolClient({}, () => receipt(purchase()), chain), hash ?? receipt(purchase()), SYMBOL, ESIM)],
    ["_verifyERC20Transfer", (chain: Chain, hash?: Hex) =>
      _verifyERC20Transfer(erc20Client({}, () => receipt([]), chain), hash ?? receipt([]), TOKEN, SENDER, DESTINATION)],
  ] as const;

  describe.each(checks)("%s", (_, check) => {
    it("reports latest, safe or finalized against the chain's own tags, inclusive", async () => {
      expect(await check({ safe: 99n, finalized: 90n })).toMatchObject({ finality: "latest", blockNumber: BLOCK, blockHash: BLOCK_HASH });
      expect((await check({ safe: 100n, finalized: 99n })).finality).toBe("safe");
      expect((await check({ safe: 100n, finalized: 100n })).finality).toBe("finalized");
    });

    it("refuses a receipt passed in from a block since reorged out", async () => {
      const reorged = { ...FINAL_CHAIN, hashAt: "0x00000000000000000000000000000000000000000000000000000000000000ff" as Hex };
      await expect(check(reorged)).rejects.toBeInstanceOf(ReceiptNotCanonicalError);
    });

    it("trusts a receipt fetched by hash without reading its block again", async () => {
      // A reorged block at that height would be caught if it were read, so passing proves it was not.
      const reorged = { ...FINAL_CHAIN, hashAt: "0x00000000000000000000000000000000000000000000000000000000000000ff" as Hex };
      expect((await check(reorged, HASH)).finality).toBe("finalized");
    });
  });

  it("reads both tags before the receipt answers", async () => {
    let answer!: (value: unknown) => void;
    const client = erc20Client({}, () => new Promise((resolve) => { answer = resolve; }));
    const pending = _verifyERC20Transfer(client, HASH, TOKEN, SENDER, DESTINATION);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(client.getBlock).toHaveBeenCalledWith({ blockTag: "safe" });
    expect(client.getBlock).toHaveBeenCalledWith({ blockTag: "finalized" });
    answer(receipt([]));

    expect((await pending).finality).toBe("finalized");
  });
});

// --- verifyERC20Transfer -----------------------------------------------------
describe("_verifyERC20Transfer", () => {
  it("totals direct transfers from sender to destination and nothing else", async () => {
    const logs = [
      transfer(TOKEN, SENDER, DESTINATION, 1_000_000n),
      transfer(TOKEN, SENDER, DESTINATION, 500_000n),
      transfer(TOKEN, STRANGER, DESTINATION, 7n),       // someone else paying
      transfer(TOKEN, SENDER, STRANGER, 7n),            // sender paying someone else
      transfer(TOKEN, DESTINATION, SENDER, 200_000n),   // sent back, not subtracted
      transfer(STRANGER, SENDER, DESTINATION, 9n),      // look-alike from another contract
      log(TOKEN, erc721Abi, "Transfer", { from: SENDER, to: DESTINATION, tokenId: 3n }),
    ];
    const result = await _verifyERC20Transfer(erc20Client(), receipt(logs), TOKEN, SENDER, DESTINATION);

    expect(result).toEqual({ priceUSDCents: 150n, amount: 1_500_000n, ...LANDED });
  });

  it("rounds cents down and scales any number of decimals", async () => {
    const one = (value: bigint) => receipt([transfer(TOKEN, SENDER, DESTINATION, value)]);

    expect(await _verifyERC20Transfer(erc20Client(), one(1_234_567n), TOKEN, SENDER, DESTINATION))
      .toMatchObject({ priceUSDCents: 123n, amount: 1_234_567n });
    expect((await _verifyERC20Transfer(erc20Client({ decimals: 18 }), one(12_345n * 10n ** 16n), TOKEN, SENDER, DESTINATION)).priceUSDCents)
      .toBe(12_345n);
    expect((await _verifyERC20Transfer(erc20Client({ decimals: 0 }), one(12n), TOKEN, SENDER, DESTINATION)).priceUSDCents)
      .toBe(1_200n);
  });

  it("answers 0 when nothing was sent", async () => {
    expect(await _verifyERC20Transfer(erc20Client(), receipt([]), TOKEN, SENDER, DESTINATION))
      .toEqual({ priceUSDCents: 0n, amount: 0n, ...LANDED });
  });

  it("refuses an address that does not answer like an ERC-20", async () => {
    const empty = erc20Client({ decimals: () => { throw new ContractFunctionZeroDataError({ functionName: "decimals" }); } });
    await expect(_verifyERC20Transfer(empty, receipt([]), TOKEN, SENDER, DESTINATION)).rejects.toBeInstanceOf(NotAnERC20TokenError);
  });

  it("passes a network failure on rather than calling the address a non-token", async () => {
    const down = erc20Client({ totalSupply: () => { throw new HttpRequestError({ url: "https://rpc.test.invalid" }); } });
    await expect(_verifyERC20Transfer(down, receipt([]), TOKEN, SENDER, DESTINATION)).rejects.toBeInstanceOf(HttpRequestError);
  });

  it("refuses a total too large for the contracts' uint64 cents", async () => {
    const huge = receipt([transfer(TOKEN, SENDER, DESTINATION, 2n ** 64n)]);
    await expect(_verifyERC20Transfer(erc20Client({ decimals: 2 }), huge, TOKEN, SENDER, DESTINATION))
      .rejects.toBeInstanceOf(PriceOutOfRangeError);
  });

  it("refuses zero, malformed and matching addresses before any read", async () => {
    const client = erc20Client();
    const cases: [Address, Address, Address][] = [
      [zeroAddress, SENDER, DESTINATION],
      [TOKEN, zeroAddress, DESTINATION],
      [TOKEN, SENDER, zeroAddress],
      [TOKEN, "0xnothex" as Address, DESTINATION],
      [TOKEN, SENDER, SENDER],
    ];
    for (const [token, from, to] of cases) {
      await expect(_verifyERC20Transfer(client, receipt([]), token, from, to)).rejects.toBeInstanceOf(InvalidAddressError);
    }
    expect(client.readContract).not.toHaveBeenCalled();
  });

  it("refuses a reverted transaction", async () => {
    await expect(_verifyERC20Transfer(erc20Client(), receipt([], "reverted"), TOKEN, SENDER, DESTINATION))
      .rejects.toBeInstanceOf(TransactionRevertedError);
  });

  it("looks a hash up alongside the token reads", async () => {
    const client = erc20Client({}, () => receipt([transfer(TOKEN, SENDER, DESTINATION, 10_000n)]));
    expect((await _verifyERC20Transfer(client, HASH, TOKEN, SENDER, DESTINATION)).priceUSDCents).toBe(1n);
  });
});
