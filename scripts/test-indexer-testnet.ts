/**
 * Live indexer test on XRPL testnet.
 *
 * Subscribes the indexer to a merchant account, sends a payment to it, and asserts
 * the settled payment is captured as a LedgerEvent (real time) — plus that a fresh
 * indexer backfills the same payment from history.
 *
 *   pnpm --filter @payper/scripts test:indexer   (build sdk + backend first)
 */
import { Client, type Payment } from "xrpl";
import { Indexer, type LedgerEvent } from "@payper/backend";

const TESTNET_WSS = "wss://s.altnet.rippletest.net:51233";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main(): Promise<void> {
  const sender = new Client(TESTNET_WSS);
  await sender.connect();

  console.log("[idx] funding testnet wallets (faucet)…");
  const [{ wallet: payer }, { wallet: merchant }] = await Promise.all([
    sender.fundWallet(),
    sender.fundWallet(),
  ]);
  console.log(`[idx]   payer    = ${payer.address}`);
  console.log(`[idx]   merchant = ${merchant.address}`);

  // Start the indexer watching the merchant BEFORE sending, so we catch it live.
  const captured: LedgerEvent[] = [];
  const indexer = new Indexer(TESTNET_WSS, [merchant.address]);
  indexer.onEvent((e) => captured.push(e));
  await indexer.start();
  console.log("[idx] indexer subscribed; sending payment…");

  const tx: Payment = {
    TransactionType: "Payment",
    Account: payer.address,
    Destination: merchant.address,
    Amount: "250000", // 0.25 XRP in drops
  };
  const prepared = await sender.autofill(tx);
  const signed = payer.sign(prepared);
  const submit = await sender.submitAndWait(signed.tx_blob);
  const sentTxid = submit.result.hash;
  console.log(`[idx] sent 0.25 XRP, txid ${sentTxid}`);

  // Wait for the live stream to surface it.
  for (let i = 0; i < 20 && captured.length === 0; i++) await sleep(500);

  const live = captured.find((e) => e.txid === sentTxid);
  if (!live) throw new Error("indexer did not capture the payment from the live stream");
  console.log("[idx] LIVE capture :", JSON.stringify(live));
  if (live.to !== merchant.address) throw new Error("captured wrong destination");
  if (live.asset !== "XRP" || live.amount !== "0.25") {
    throw new Error(`unexpected amount/asset: ${live.asset} ${live.amount}`);
  }

  await indexer.stop();

  // A fresh indexer should backfill the same payment from history.
  const backfilled: LedgerEvent[] = [];
  const fresh = new Indexer(TESTNET_WSS, [merchant.address]);
  fresh.onEvent((e) => backfilled.push(e));
  await fresh.start();
  await fresh.backfill();
  await fresh.stop();

  const back = backfilled.find((e) => e.txid === sentTxid);
  console.log(`[idx] BACKFILL found ${backfilled.length} event(s); target present: ${Boolean(back)}`);
  if (!back) throw new Error("backfill did not include the payment");

  await sender.disconnect();

  console.log("\n✅ indexer captured the settled payment live and via backfill");
  console.log(`   explorer : https://testnet.xrpl.org/transactions/${sentTxid}`);
}

main().catch((err) => {
  console.error("[idx] failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
