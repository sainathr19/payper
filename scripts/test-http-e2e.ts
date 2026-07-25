/**
 * W3–5 end-to-end HTTP test.
 *
 * Stands up a real Express server with the Payper middleware, then drives the
 * full x402 HTTP flow as an agent would — over the wire, through the LIVE t54
 * testnet facilitator:
 *
 *   GET /inference           -> 402 + PAYMENT-REQUIRED (quote stored)
 *   GET /inference + sig      -> middleware verifies vs stored quote, settles,
 *                               consumes the quote, returns 200 + PAYMENT-RESPONSE
 *
 *   pnpm --filter @payper/scripts test:e2e   (build sdk + gateway first)
 */
import type { AddressInfo } from "node:net";
import express from "express";
import { Client } from "xrpl";
import {
  HEADERS,
  NETWORK,
  T54_FACILITATOR,
  T54Facilitator,
  decodePaymentRequired,
  decodeSettleResponse,
  encodePaymentPayload,
  signXrplPayment,
} from "@payper/sdk";
import { payper } from "@payper/gateway";

const TESTNET_WSS = "wss://s.altnet.rippletest.net:51233";
const PRICE_DROPS = "100000"; // 0.1 XRP

async function main(): Promise<void> {
  const client = new Client(TESTNET_WSS);
  await client.connect();

  console.log("[e2e] funding testnet wallets (faucet)…");
  const [{ wallet: agent }, { wallet: merchant }] = await Promise.all([
    client.fundWallet(),
    client.fundWallet(),
  ]);
  console.log(`[e2e]   agent    = ${agent.address}`);
  console.log(`[e2e]   merchant = ${merchant.address}`);

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
    // 1. Unpaid request -> 402 + quote.
    const unpaid = await fetch(url);
    console.log(`[e2e] GET ${url} -> ${unpaid.status}`);
    if (unpaid.status !== 402) throw new Error(`expected 402, got ${unpaid.status}`);
    const quote = decodePaymentRequired(unpaid.headers.get(HEADERS.required)!);
    const requirements = quote.accepts[0]!;

    // 2. Agent signs the quote and retries.
    const payload = await signXrplPayment(client, agent, requirements);
    const paid = await fetch(url, {
      headers: { [HEADERS.signature]: encodePaymentPayload(payload) },
    });
    console.log(`[e2e] GET + PAYMENT-SIGNATURE -> ${paid.status}`);
    const body = await paid.json();
    if (paid.status !== 200) throw new Error(`expected 200, got ${paid.status}: ${JSON.stringify(body)}`);

    const receipt = decodeSettleResponse(paid.headers.get(HEADERS.response)!);
    console.log("[e2e] body   :", JSON.stringify(body));
    console.log("[e2e] receipt:", JSON.stringify(receipt));

    // 3. Replay the SAME payment -> quote already consumed -> rejected.
    const replay = await fetch(url, {
      headers: { [HEADERS.signature]: encodePaymentPayload(payload) },
    });
    console.log(`[e2e] replay same quote -> ${replay.status} (expect 402)`);

    console.log("\n✅ end-to-end HTTP flow settled through the live t54 facilitator");
    console.log(`   txid     : ${receipt.transaction}`);
    console.log(`   explorer : https://testnet.xrpl.org/transactions/${receipt.transaction}`);
  } finally {
    server.close();
    await client.disconnect();
  }
}

main().catch((err) => {
  console.error("[e2e] failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
