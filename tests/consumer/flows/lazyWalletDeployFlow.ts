import { afterAll, afterEach, beforeAll, describe, expect, it, type Mock } from "vitest";
import { erc20Abi, formatUnits, hexToString, stringToHex, type Address, type Hex } from "viem";
import { ContractRevertError } from "kokio-sdk";
import type { KokioAdmin } from "kokio-sdk/admin";
import { ESIMWallet } from "kokio-sdk/abis";
import { Settlement, type DataBundleDetails } from "kokio-sdk/types";

import type { FlowTarget } from "./userFlow.js";
import { asPasskey } from "../fixtures/passkeyAuthenticator.js";
import { expectSponsored } from "../fixtures/sponsorship.js";
import { createTestUser, type TestUser } from "../fixtures/user.js";
import { TEST_TAG, testBytes32 } from "../fixtures/testLabels.js";

// Two eSIMs with more history than one copy call takes by default (25), and 18
// small ones, so the 20 wallets also need more than one deploy call (10 each).
const PURCHASES_PER_ESIM = [26, 26, ...Array.from({ length: 18 }, (_, i) => (i % 3) + 1)];
const TOTAL_PURCHASES = PURCHASES_PER_ESIM.reduce((sum, n) => sum + n, 0);
const PURCHASES_PER_RECORDING = 10;

// A user who bought every bundle by card or from an external wallet before
// installing the app, so all of it sits in the lazy wallet registry. The backend
// deploys their wallets and copies the history in when they sign up.
export const describeLazyWalletDeployFlow = (
  name: string,
  setup: () => Promise<FlowTarget>,
  passkeyGet: Mock,
  { timeout }: { timeout: number },
) => describe(name, () => {
  let target: FlowTarget;
  let admin: KokioAdmin;
  let user: TestUser;
  let eSIMIds: string[];
  // Each eSIM's purchases, in the order they were bought.
  let history: DataBundleDetails[][];
  let eSIMWallets: readonly Address[];

  beforeAll(async () => {
    target = await setup();
    admin = target.admin;
    // Only a passkey and a counterfactual address so far. Nothing is onchain.
    user = await createTestUser(target, passkeyGet);
    names.set(user.deviceWallet, "device A");

    eSIMIds = PURCHASES_PER_ESIM.map((_, e) => `${user.uid}-e${e}`);
    history = PURCHASES_PER_ESIM.map((count, e) => Array.from({ length: count }, (_, n) => ({
      id: testBytes32(`lz${e}-${n}`),
      priceUSDCents: BigInt(100 + ((e * 7 + n * 13) % 900)),
      settlement: (e + n) % 2 === 0 ? Settlement.Fiat : Settlement.ExternalWallet,
    })));
  }, 180_000);

  afterAll(async () => {
    await target?.stop?.();
  });

  it(`1. the backend records ${TOTAL_PURCHASES} card and external wallet purchases as they come in`, async () => {
    // Round robin over the eSIMs, so one eSIM's purchases span several recordings
    // and their order has to survive across transactions.
    const arrivals: { eSIMId: string; details: DataBundleDetails }[] = [];
    for (let round = 0; round < Math.max(...PURCHASES_PER_ESIM); round++) {
      history.forEach((purchases, e) => {
        if (round < purchases.length) arrivals.push({ eSIMId: eSIMIds[e], details: purchases[round] });
      });
    }
    expect(arrivals).toHaveLength(TOTAL_PURCHASES);

    log(`device ${user.uid} has no wallet. Every purchase goes to the lazy wallet registry.`);
    const recordings = Math.ceil(arrivals.length / PURCHASES_PER_RECORDING);
    for (let start = 0; start < arrivals.length; start += PURCHASES_PER_RECORDING) {
      const chunk = arrivals.slice(start, start + PURCHASES_PER_RECORDING);
      await backend(`batchPopulateHistory ${start / PURCHASES_PER_RECORDING + 1}/${recordings}, ${chunk.length} purchases`,
        admin.lazyWalletRegistry.batchPopulateHistory([user.uid], [chunk.map((a) => a.eSIMId)], [chunk.map((a) => a.details)]));
      for (const { eSIMId, details } of chunk) detail(`+ ${purchase(shortId(eSIMId), details)}`);
    }

    expect(await admin.lazyWalletRegistry.isDeviceIdentifierReserved(user.uid)).toBe(true);
    expect(await admin.registry.isDeviceIdentifierAlreadyUsed(user.uid)).toBe(false);
    for (const [e, eSIMId] of eSIMIds.entries()) {
      // Listed in the order the device first bought each eSIM.
      expect(await admin.lazyWalletRegistry.eSIMIdentifiersAssociatedWithDeviceIdentifier(user.uid, BigInt(e))).toBe(eSIMId);
      expect(await admin.lazyWalletRegistry.outstandingHistoryEntries(eSIMId)).toBe(BigInt(PURCHASES_PER_ESIM[e]));
    }
    log(`waiting to be copied per eSIM: ${eSIMIds.map((id, e) => `${shortId(id)}=${PURCHASES_PER_ESIM[e]}`).join(" ")}`);
  }, timeout);

  it("2. the app's passkey resolves to the address the backend will deploy", async () => {
    // The app resolved its account from the passkey, the device id and the salt the backend stores.
    const counterfactual = await admin.deviceWalletFactory.getCounterFactualAddress(user.signer.ownerKey, user.uid, user.salt);
    expect(user.deviceWallet).toBe(counterfactual);
    expect(await target.publicClient.getCode({ address: counterfactual })).toBeUndefined();
    log(`app and backend agree: device A will be ${counterfactual} (salt ${user.salt}), nothing deployed yet`);
  }, timeout);

  it("3. the backend deploys the device wallet and all 20 eSIM wallets", async () => {
    const deployment = await admin.lazyWalletRegistry.deployLazyWalletAndSetESIMIdentifier(user.signer.ownerKey, user.uid, user.salt, 0n);
    eSIMWallets = deployment.eSIMWallets;

    log(`backend deployLazyWalletAndSetESIMIdentifier: device A ${deployment.deviceWallet}, ${deployment.batches.length} transactions`);
    for (const [b, batch] of deployment.batches.entries()) {
      detail(`batch ${b + 1} tx ${batch.hash}: ${batch.eSIMWallets.length} eSIM wallets, ${batch.remaining} still to deploy`);
      batch.eSIMIdentifiers.forEach((id, i) => {
        names.set(batch.eSIMWallets[i], shortId(id));
        detail(`  ${shortId(id).padEnd(4)} -> ${batch.eSIMWallets[i]}`);
      });
    }

    expect(deployment.alreadyComplete).toBe(false);
    expect(deployment.batches.map((batch) => batch.remaining)).toEqual([10n, 0n]);
    expect(deployment.eSIMIdentifiers).toEqual(eSIMIds);
    expect(eSIMWallets).toHaveLength(eSIMIds.length);
    expect(new Set(eSIMWallets).size).toBe(eSIMWallets.length);

    const deviceWallet = user.deviceWallet;
    expect(deployment.deviceWallet).toBe(deviceWallet);
    expect(await target.publicClient.getCode({ address: deviceWallet })).toMatch(/^0x[0-9a-f]+$/i);
    expect(await admin.registry.isDeviceWalletValid(deviceWallet)).toBe(true);
    expect(await admin.registry.uniqueIdentifierToDeviceWallet(user.uid)).toBe(deviceWallet);
    expect(await admin.lazyWalletRegistry.eSIMWalletsDeployed(user.uid)).toBe(BigInt(eSIMIds.length));

    admin.setDeviceWalletAddress(deviceWallet);
    for (const [e, wallet] of eSIMWallets.entries()) {
      expect(await target.publicClient.getCode({ address: wallet })).toMatch(/^0x[0-9a-f]+$/i);
      expect(await readESIMWallet(wallet, "owner")).toBe(deviceWallet);
      expect(await readESIMWallet(wallet, "eSIMUniqueIdentifier")).toBe(eSIMIds[e]);
      expect(await admin.registry.isESIMWalletValid(wallet)).toBe(deviceWallet);
      expect(await admin.registry.eSIMWalletForIdentifier(eSIMIds[e])).toBe(wallet);
      expect(await admin.lazyWalletRegistry.lazyDeployedESIMWallet(eSIMIds[e])).toBe(wallet);
      expect(await admin.deviceWallet!.isValidESIMWallet(wallet)).toBe(true);
    }
    log("every eSIM wallet is owned by device A, named, and known to the registry");
  }, timeout);

  it("4. a new purchase is refused until the eSIM's history is copied in", async () => {
    const usd = stringToHex("USD", { size: 32 });
    const err = await admin.registry.recordSettledPurchase(
      eSIMWallets[0],
      { id: testBytes32("lz-early"), priceUSDCents: target.priceUSDCents, settlement: Settlement.Fiat },
      usd, target.priceUSDCents, testBytes32(`lze-${Date.now()}`),
    ).then(() => undefined, (e: unknown) => e);

    // Refused before sending, so this costs nothing.
    expect(err).toBeInstanceOf(ContractRevertError);
    expect((err as ContractRevertError).decoded?.errorName).toBe("HistoryNotFullyCopied");
    log(`backend recordSettledPurchase on e0 refused before sending: ${(err as ContractRevertError).decoded?.errorName}`);
  }, timeout);

  it("5. the backend copies every eSIM's history onto its wallet", async () => {
    for (const [e, eSIMId] of eSIMIds.entries()) {
      const copy = await admin.lazyWalletRegistry.setHistoryForLazyWallet(eSIMId);
      const count = BigInt(PURCHASES_PER_ESIM[e]);

      log(`backend setHistoryForLazyWallet ${shortId(eSIMId)}: ${nEntries(copy.copied)} in ${plural(copy.batches.length, "transaction")}`);
      for (const batch of copy.batches) detail(`tx ${batch.hash}: copied ${batch.copied}, ${batch.remaining} left`);

      expect(copy.eSIMWallet).toBe(eSIMWallets[e]);
      expect(copy.copied).toBe(count);
      expect(copy.batches.map((batch) => batch.copied)).toEqual(count > 25n ? [25n, count - 25n] : [count]);
      expect(await admin.lazyWalletRegistry.historyEntriesCopied(eSIMId)).toBe(count);
      expect(await admin.lazyWalletRegistry.outstandingHistoryEntries(eSIMId)).toBe(0n);
    }
  }, timeout);

  it(`6. each eSIM wallet holds exactly its own purchases, in order, ${TOTAL_PURCHASES} in all`, async () => {
    for (const [e, wallet] of eSIMWallets.entries()) {
      const stored = await readAllHistory(wallet);
      expect(stored, `eSIM ${e}`).toEqual(history[e]);
      log(`${nameOf(wallet)} ${wallet}: ${nEntries(stored.length)}, all match what was recorded`);
      // The two long histories in full, so their order is visible.
      if (e < 2) stored.forEach((d, n) => detail(purchase(`#${n}`, d)));
    }
  }, timeout);

  it("7. running the deploy and the copy again sends nothing", async () => {
    const deployAgain = await admin.lazyWalletRegistry.deployLazyWalletAndSetESIMIdentifier(user.signer.ownerKey, user.uid, user.salt, 0n);
    expect(deployAgain).toMatchObject({ deviceWallet: user.deviceWallet, alreadyComplete: true, batches: [] });

    const copyAgain = await admin.lazyWalletRegistry.setHistoryForLazyWallet(eSIMIds[0]);
    expect(copyAgain).toMatchObject({ eSIMWallet: eSIMWallets[0], copied: 0n, alreadyComplete: true });
    log("backend reran deployLazyWalletAndSetESIMIdentifier and setHistoryForLazyWallet: both already complete, no transactions");
  }, timeout);

  it("8. the user's passkey buys a new bundle on the lazily deployed wallet", async () => {
    const bundle = await buy(user, eSIMWallets[0], "lz-after");

    // Lands after the copied history, not in front of it.
    expect(await readAllHistory(eSIMWallets[0])).toEqual([...history[0], bundle]);
    log(`e0 now has ${nEntries(history[0].length + 1)}, the new one last`);
  }, timeout);

  const newESIMWallets: Address[] = [];

  it("9. the device wallet buys 2 more eSIMs, each with a first bundle", async () => {
    // Salts the lazy deploy never used: it took the device's own salt and the 19 after it.
    for (const salt of [1n, 2n]) {
      let eSIMWallet!: Address;
      await sponsored(user, `deployAndBindESIMWallet(salt ${salt})`, async () => {
        const result = await user.kokio.deviceWallet!.deployAndBindESIMWallet(salt);
        eSIMWallet = result.eSIMWalletAddress;
        return result.userOpHash;
      });
      names.set(eSIMWallet, `n${salt}`);
      detail(`n${salt} -> ${eSIMWallet}`);
      expect(eSIMWallets).not.toContain(eSIMWallet);

      const bundle = await buy(user, eSIMWallet, `lz-new-${salt}`);
      const eSIMId = `${user.uid}-n${salt}`;
      await backend(`assignESIMIdentifier n${salt} = ${eSIMId}`, admin.registry.assignESIMIdentifier(eSIMWallet, eSIMId));

      expect(await readESIMWallet(eSIMWallet, "eSIMUniqueIdentifier")).toBe(eSIMId);
      expect(await admin.registry.isESIMWalletValid(eSIMWallet)).toBe(user.deviceWallet);
      expect(await readAllHistory(eSIMWallet)).toEqual([bundle]);
      newESIMWallets.push(eSIMWallet);
    }
  }, timeout);

  let next: TestUser;

  it("10. another device is set up to take eSIMs over", async () => {
    next = await createTestUser(target, passkeyGet);
    names.set(next.deviceWallet, "device B");
    await sponsored(next, "an empty operation to deploy itself", () => next.kokio.deviceWallet!.sendUserOperation([]));
    await backend(`postCreateAccount device B ${next.deviceWallet}`,
      admin.deviceWalletFactory.postCreateAccount(next.deviceWallet, next.uid, next.signer.ownerKey, next.salt));

    expect(await admin.registry.isDeviceWalletValid(next.deviceWallet)).toBe(true);
  }, timeout);

  // The lazy eSIM with the longest history, and one bought after the deploy.
  const moving = () => [eSIMWallets[0], newESIMWallets[0]];

  it("11. the lazy eSIM with history and a new eSIM move to the other device, history intact", async () => {
    for (const wallet of moving()) {
      const [historyBefore, eSIMId] = await Promise.all([readAllHistory(wallet), readESIMWallet(wallet, "eSIMUniqueIdentifier")]);
      log(`moving ${nameOf(wallet)} (${nEntries(historyBefore.length)}) from device A to device B`);

      as(user).kokio.setESIMWalletAddress(wallet);
      await sponsored(user, `requestTransferOwnership(${nameOf(wallet)} to device B)`,
        () => user.kokio.eSIMWallet!.requestTransferOwnership(next.deviceWallet));
      expect(await admin.registry.isESIMWalletOnStandby(wallet)).toBe(true);
      detail(`${nameOf(wallet)} is on standby while the move is pending`);

      as(next).kokio.setESIMWalletAddress(wallet);
      await sponsored(next, `acceptAndBindESIMWallet(${nameOf(wallet)})`, () => next.kokio.eSIMWallet!.acceptAndBindESIMWallet());

      expect(await readESIMWallet(wallet, "owner")).toBe(next.deviceWallet);
      expect(await admin.registry.isESIMWalletValid(wallet)).toBe(next.deviceWallet);
      expect(await admin.registry.isESIMWalletOnStandby(wallet)).toBe(false);
      expect(await next.kokio.deviceWallet!.isValidESIMWallet(wallet)).toBe(true);
      expect(await next.kokio.deviceWallet!.canPullFunds(wallet)).toBe(false);
      expect(await user.kokio.deviceWallet!.isValidESIMWallet(wallet)).toBe(false);
      // The eSIM and everything it bought travel with the wallet.
      expect(await readESIMWallet(wallet, "eSIMUniqueIdentifier")).toBe(eSIMId);
      expect(await readAllHistory(wallet)).toEqual(historyBefore);
      detail(`${nameOf(wallet)} now belongs to device B, identifier and ${nEntries(historyBefore.length)} unchanged`);
    }

    // Every other eSIM stays with the first device.
    const staying = [...eSIMWallets.slice(1), newESIMWallets[1]];
    for (const wallet of staying) {
      expect(await admin.registry.isESIMWalletValid(wallet)).toBe(user.deviceWallet);
    }
    log(`still with device A: ${staying.map(nameOf).join(" ")}`);
  }, timeout);

  it("12. the new device buys on the moved eSIMs, and the old device no longer can", async () => {
    for (const wallet of moving()) {
      const historyBefore = await readAllHistory(wallet);
      const bundle = await buy(next, wallet, "lz-moved");
      expect(await readAllHistory(wallet)).toEqual([...historyBefore, bundle]);
      detail(`${nameOf(wallet)} now has ${nEntries(historyBefore.length + 1)}`);

      as(user).kokio.setESIMWalletAddress(wallet);
      const quote = await user.kokio.paymentAdapter!.quote(ASSET, bundle.priceUSDCents);
      const err = await user.kokio.eSIMWallet!.buyDataBundleWithToken(bundle, ASSET, quote, nextRef()).then(() => undefined, (e: unknown) => e);
      expect(err).toBeInstanceOf(ContractRevertError);
      expect((err as ContractRevertError).decoded?.errorName).toBe("OnlyDeviceWalletOrESIMWalletAdmin");
      log(`device A tries buyDataBundleWithToken on ${nameOf(wallet)}: refused, ${(err as ContractRevertError).decoded?.errorName}`);
    }
  }, timeout);

  // The settlement token on Base Sepolia, and the one the test admin holds plenty of.
  const ASSET_SYMBOL = "USDCt";
  const ASSET = stringToHex(ASSET_SYMBOL, { size: 32 });
  // Payment references are spendable once per eSIM wallet, so each purchase gets its own.
  const RUN = Date.now().toString(36);
  let refs = 0;
  const nextRef = () => testBytes32(`r${++refs}-${RUN}`);

  // Points the mocked passkey at this user, as their own phone would sign.
  const as = (who: TestUser) => {
    passkeyGet.mockImplementation(asPasskey(who.signer));
    return who;
  };

  const sponsored = async (who: TestUser, what: string, send: () => Promise<Hex>) => {
    const receipt = await expectSponsored(who.client, target.publicClient, send, { confirmations: target.confirmations });
    log(`${nameOf(who.deviceWallet)} signs ${what}: user operation ${receipt.userOpHash}, tx ${receipt.receipt.transactionHash}`);
    return receipt;
  };

  // A purchase paid in tokens the device wallet sends over in the same operation.
  const buy = async (buyer: TestUser, eSIMWallet: Address, bundleName: string): Promise<DataBundleDetails> => {
    const bundle = { id: testBytes32(bundleName), priceUSDCents: target.priceUSDCents, settlement: Settlement.DeviceWallet };
    const ref = nextRef();

    as(buyer).kokio.setESIMWalletAddress(eSIMWallet);
    const { token } = await buyer.kokio.paymentAdapter!.resolveAsset(ASSET);
    const quote = await buyer.kokio.paymentAdapter!.quote(ASSET, bundle.priceUSDCents);
    await target.fund(token, buyer.deviceWallet, quote);

    const receipt = await sponsored(buyer, `buyDataBundleWithTransfer on ${nameOf(eSIMWallet)}`,
      () => buyer.kokio.eSIMWallet!.buyDataBundleWithTransfer(bundle, ASSET, quote, ref));

    const [event] = await target.publicClient.getContractEvents({
      address: eSIMWallet, abi: ESIMWallet, eventName: "DataBundleBoughtWithToken",
      args: { _paymentReference: ref }, fromBlock: receipt.receipt.blockNumber,
    });
    expect(event.args).toMatchObject({ _dataBundleID: bundle.id, _token: token, _amountSpent: quote });
    expect(await target.publicClient.readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [buyer.deviceWallet] })).toBe(0n);
    const decimals = await target.publicClient.readContract({ address: token, abi: erc20Abi, functionName: "decimals" });
    detail(`+ ${purchase(nameOf(eSIMWallet), bundle)}, paid ${formatUnits(quote, decimals)} ${ASSET_SYMBOL} sent over by ${nameOf(buyer.deviceWallet)}`);
    return bundle;
  };

  // The contract has no length getter, so read upwards until an index reverts.
  const readAllHistory = async (address: Address): Promise<DataBundleDetails[]> => {
    const entries: DataBundleDetails[] = [];
    for (;;) {
      const entry = await readHistory(address, BigInt(entries.length)).catch(() => undefined);
      if (!entry) return entries;
      entries.push(entry);
    }
  };

  // An admin transaction: waits for it to land, then logs what it did.
  const backend = async (what: string, sending: Promise<Hex>) => {
    const hash = await sending;
    const receipt = await target.publicClient.waitForTransactionReceipt({ hash, confirmations: target.confirmations });
    expect(receipt.status).toBe("success");
    log(`backend ${what}: tx ${hash}`);
    return receipt;
  };

  const readESIMWallet = (address: Address, functionName: "owner" | "eSIMUniqueIdentifier") =>
    target.publicClient.readContract({ address, abi: ESIMWallet, functionName });

  const readHistory = async (address: Address, index: bigint): Promise<DataBundleDetails> => {
    const [id, priceUSDCents, settlement] = await target.publicClient.readContract({
      address, abi: ESIMWallet, functionName: "transactionHistory", args: [index],
    });
    return { id, priceUSDCents, settlement };
  };

  // Short names so the log reads as a story: device A and B, e0 to e19 for the
  // lazy eSIMs, n1 and n2 for the two bought afterwards.
  const names = new Map<Address, string>();
  const nameOf = (address: Address) => names.get(address) ?? address;
  const shortId = (eSIMId: string) => eSIMId.slice(user.uid.length + 1);
  const bundleName = (id: Hex) => hexToString(id, { size: 32 }).replace(`${TEST_TAG}:`, "");
  const usd = (cents: bigint) => `$${cents / 100n}.${(cents % 100n).toString().padStart(2, "0")}`;
  const purchase = (eSIM: string, d: DataBundleDetails) =>
    `${eSIM.padEnd(4)} bundle ${bundleName(d.id).padEnd(10)} ${usd(d.priceUSDCents).padStart(6)}  ${Settlement[d.settlement]}`;

  const plural = (count: number | bigint, one: string, many = `${one}s`) => `${count} ${Number(count) === 1 ? one : many}`;
  const nEntries = (count: number | bigint) => plural(count, "entry", "entries");

  // Collected per step and printed once it ends, so each step's story reads as
  // one block rather than a header per line.
  const lines: string[] = [];
  const log = (message: string) => lines.push(message);
  const detail = (message: string) => lines.push(`    ${message}`);
  afterEach(() => {
    if (lines.length > 0) console.log(lines.splice(0).join("\n"));
  });
});
