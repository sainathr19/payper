import { Client, Wallet } from "xrpl";
import {
  HEADERS,
  X402_VERSION,
  decodePaymentRequired,
  encodePaymentPayload,
  signXrplPayment,
} from "@payper/sdk";

const TESTNET_WSS = "wss://s.altnet.rippletest.net:51233";

/**
 * Autonomous reference agent (mirrors the XRPL AI Starter Kit's Agent Wallet +
 * Payment skills). Discovers a resource, pays the 402 quote, retries.
 *
 *   1. GET the resource → receive 402 + PAYMENT-REQUIRED quote.
 *   2. Sign an XRPL Payment for the quoted terms.
 *   3. Retry with PAYMENT-SIGNATURE → receive 200 + PAYMENT-RESPONSE (txid).
 */
async function payFor(url: string, client: Client, wallet: Wallet): Promise<Response> {
  const first = await fetch(url);
  if (first.status !== 402) return first;

  const quoteB64 = first.headers.get(HEADERS.required);
  if (!quoteB64) throw new Error("402 without PAYMENT-REQUIRED header");

  const quote = decodePaymentRequired(quoteB64);
  const requirements = quote.accepts[0];
  if (!requirements) throw new Error("no acceptable payment requirements in quote");

  const payload = await signXrplPayment(client, wallet, requirements);
  return fetch(url, {
    headers: { [HEADERS.signature]: encodePaymentPayload({ ...payload, x402Version: X402_VERSION }) },
  });
}

async function main(): Promise<void> {
  const target = process.argv[2] ?? "http://localhost:8787/inference";

  const client = new Client(TESTNET_WSS);
  await client.connect();
  try {
    const { wallet } = await client.fundWallet();
    console.log(`[agent] funded wallet ${wallet.address}`);

    const res = await payFor(target, client, wallet);
    const receipt = res.headers.get(HEADERS.response);
    console.log("[agent]", res.status, await res.text());
    if (receipt) console.log("[agent] PAYMENT-RESPONSE:", receipt);
  } finally {
    await client.disconnect();
  }
}

main().catch((err) => {
  console.error("[agent] failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
