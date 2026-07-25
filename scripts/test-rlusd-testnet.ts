/**
 * RLUSD (IOU) end-to-end test on XRPL testnet.
 *
 * Ripple's RLUSD is mainnet-only, so this stands up a local RLUSD issuer, wires
 * trust lines, funds the agent with RLUSD, then drives the real Payper middleware
 * over HTTP with an IOU payment settled via the direct-XRPL facilitator:
 *
 *   issuer: enable rippling → trust lines (agent, merchant) → issue RLUSD to agent
 *   agent : GET /inference → 402 → sign RLUSD Payment → retry → 200 + PAYMENT-RESPONSE
 *
 *   pnpm --filter @payper/scripts test:rlusd   (build sdk + gateway first)
 */
import type { AddressInfo } from "node:net";
import express from "express";
import { AccountSetAsfFlags, Client, type Payment } from "xrpl";
import {
  DirectXrplFacilitator,
  HEADERS,
  NETWORK,
  RLUSD_CURRENCY,
  decodePaymentRequired,
  decodeSettleResponse,
  encodePaymentPayload,
  ensureTrustLine,
  signXrplPayment,
} from "@payper/sdk";
import { payper } from "@payper/gateway";

const TESTNET_WSS = "wss://s.altnet.rippletest.net:51233";
const PRICE_RLUSD = "0.01";

async function submit(client: Client, wallet: import("xrpl").Wallet, tx: Payment | object) {
  const prepared = await client.autofill(tx as Payment);
  const signed = wallet.sign(prepared);
  return client.submitAndWait(signed.tx_blob);
}

async function rlusdBalance(client: Client, account: string, issuer: string): Promise<string> {
  const lines = await client.request({ command: "account_lines", account, peer: issuer });
  const line = lines.result.lines.find(
    (l) => l.currency.toUpperCase() === RLUSD_CURRENCY.toUpperCase(),
  );
  return line?.balance ?? "0";
}

async function main(): Promise<void> {
  const client = new Client(TESTNET_WSS);
  await client.connect();

  console.log("[rlusd] funding testnet wallets (faucet)…");
  const [{ wallet: issuer }, { wallet: agent }, { wallet: merchant }] = await Promise.all([
    client.fundWallet(),
    client.fundWallet(),
    client.fundWallet(),
  ]);
  console.log(`[rlusd]   issuer   = ${issuer.address}`);
  console.log(`[rlusd]   agent    = ${agent.address}`);
  console.log(`[rlusd]   merchant = ${merchant.address}`);

  // Issuer must allow rippling so agent → merchant IOU payments flow through it.
  await submit(client, issuer, {
    TransactionType: "AccountSet",
    Account: issuer.address,
    SetFlag: AccountSetAsfFlags.asfDefaultRipple,
  });

  // Onboarding: agent and merchant trust the RLUSD issuer.
  await ensureTrustLine(client, agent, RLUSD_CURRENCY, issuer.address);
  await ensureTrustLine(client, merchant, RLUSD_CURRENCY, issuer.address);
  console.log("[rlusd] trust lines established");

  // Issue RLUSD to the agent so it has something to spend.
  await submit(client, issuer, {
    TransactionType: "Payment",
    Account: issuer.address,
    Destination: agent.address,
    Amount: { currency: RLUSD_CURRENCY, issuer: issuer.address, value: "100" },
  });
  console.log(`[rlusd] issued 100 RLUSD to agent (balance ${await rlusdBalance(client, agent.address, issuer.address)})`);

  // The seller: an endpoint priced in RLUSD.
  const app = express();
  app.get(
    "/inference",
    payper({
      price: PRICE_RLUSD,
      asset: RLUSD_CURRENCY,
      issuer: issuer.address,
      payTo: merchant.address,
      network: NETWORK.testnet,
      facilitator: new DirectXrplFacilitator(client),
    }),
    (_req, res) => res.json({ result: "paid response — priced in RLUSD" }),
  );
  const server = app.listen(0);
  const { port } = server.address() as AddressInfo;
  const url = `http://127.0.0.1:${port}/inference`;

  try {
    const unpaid = await fetch(url);
    console.log(`[rlusd] GET ${url} -> ${unpaid.status}`);
    const quote = decodePaymentRequired(unpaid.headers.get(HEADERS.required)!);
    const requirements = quote.accepts[0]!;

    const payload = await signXrplPayment(client, agent, requirements);
    const paid = await fetch(url, {
      headers: { [HEADERS.signature]: encodePaymentPayload(payload) },
    });
    console.log(`[rlusd] GET + PAYMENT-SIGNATURE -> ${paid.status}`);
    const body = await paid.json();
    if (paid.status !== 200) throw new Error(`expected 200: ${JSON.stringify(body)}`);
    const receipt = decodeSettleResponse(paid.headers.get(HEADERS.response)!);

    const merchantBal = await rlusdBalance(client, merchant.address, issuer.address);
    console.log("[rlusd] body    :", JSON.stringify(body));
    console.log("[rlusd] receipt :", JSON.stringify(receipt));
    console.log(`[rlusd] merchant RLUSD balance = ${merchantBal}`);

    console.log("\n✅ RLUSD (IOU) payment settled through the Payper middleware");
    console.log(`   txid     : ${receipt.transaction}`);
    console.log(`   explorer : https://testnet.xrpl.org/transactions/${receipt.transaction}`);
  } finally {
    server.close();
    await client.disconnect();
  }
}

main().catch((err) => {
  console.error("[rlusd] failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
