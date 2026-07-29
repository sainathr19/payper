/**
 * W9 autonomous-agent live test.
 *
 * Stands up a real Express seller monetized with the Payper middleware, then
 * turns the autonomous agent loop loose on it — proving the agent produces
 * REPEATED, real settlements through the LIVE t54 testnet facilitator (the
 * demo's source of continuous on-chain volume), not just a single payment.
 *
 *   GET /inference           -> 402 + PAYMENT-REQUIRED (fresh quote each call)
 *   GET /inference + sig      -> verify vs stored quote, settle, 200 + PAYMENT-RESPONSE
 *   …repeated `CALLS` times, each a distinct validated XRPL transaction.
 *
 *   pnpm --filter @payper/scripts test:agent   (build sdk + gateway + agent first)
 */
import type { AddressInfo } from "node:net";
import express from "express";
import { Client } from "xrpl";
import { NETWORK, T54_FACILITATOR, T54Facilitator } from "@payper/sdk";
import { payper } from "@payper/gateway";
import { runLoop } from "@payper/agent";

const TESTNET_WSS = "wss://s.altnet.rippletest.net:51233";
const PRICE_DROPS = "100000"; // 0.1 XRP
const CALLS = 3;
const INTERVAL_MS = 1000;

async function main(): Promise<void> {
  const client = new Client(TESTNET_WSS);
  await client.connect();

  console.log("[agent-test] funding testnet wallets (faucet)…");
  const [{ wallet: agent }, { wallet: merchant }] = await Promise.all([
    client.fundWallet(),
    client.fundWallet(),
  ]);
  console.log(`[agent-test]   agent    = ${agent.address}`);
  console.log(`[agent-test]   merchant = ${merchant.address}`);

  // --- The seller: an Express app monetized with one line of Payper. ---
  const app = express();
  app.get(
    "/inference",
    payper({
      price: PRICE_DROPS,
      asset: "XRP",
      payTo: merchant.address,
      network: NETWORK.testnet,
      facilitator: new T54Facilitator(T54_FACILITATOR.testnet),
    }),
    (_req, res) => res.json({ result: "paid response — your model output here" }),
  );

  const server = app.listen(0);
  const { port } = server.address() as AddressInfo;
  const url = `http://127.0.0.1:${port}/inference`;

  try {
    console.log(`[agent-test] agent paying ${url} — ${CALLS} calls\n`);
    const summary = await runLoop(url, client, agent, {
      count: CALLS,
      intervalMs: INTERVAL_MS,
    });

    console.log(
      `\n[agent-test] ${summary.settled}/${summary.attempts} settled, ${summary.failed} failed`,
    );

    if (summary.settled !== CALLS) {
      throw new Error(`expected ${CALLS} settlements, got ${summary.settled}`);
    }
    if (new Set(summary.txids).size !== CALLS) {
      throw new Error(`expected ${CALLS} distinct txids, got ${new Set(summary.txids).size}`);
    }

    console.log(`\n✅ autonomous agent settled ${CALLS} distinct payments through the live t54 facilitator`);
    for (const txid of summary.txids) {
      console.log(`   https://testnet.xrpl.org/transactions/${txid}`);
    }
  } finally {
    server.close();
    await client.disconnect();
  }
}

main().catch((err) => {
  console.error("[agent-test] failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
