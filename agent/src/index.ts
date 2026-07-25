import {
  HEADERS,
  decodePaymentRequired,
  encodePaymentPayload,
  type PaymentPayload,
  type PaymentRequired,
} from "@payper/sdk";

/**
 * Autonomous reference agent (built on the XRPL AI Starter Kit's Agent Wallet +
 * Payment skills). It discovers marketplace services and pays for them on a loop,
 * generating continuous real on-chain volume.
 *
 * Flow per call:
 *   1. GET the resource → receive 402 + PAYMENT-REQUIRED quote.
 *   2. Sign an XRPL Payment for the quoted terms (Starter Kit wallet).
 *   3. Retry with PAYMENT-SIGNATURE → receive 200 + PAYMENT-RESPONSE (txid).
 */
async function payFor(url: string): Promise<Response> {
  const first = await fetch(url);
  if (first.status !== 402) return first;

  const quoteB64 = first.headers.get(HEADERS.required);
  if (!quoteB64) throw new Error("402 without PAYMENT-REQUIRED header");
  const quote = decodePaymentRequired(quoteB64);

  const payload = await signPayment(quote);
  return fetch(url, { headers: { [HEADERS.signature]: encodePaymentPayload(payload) } });
}

async function signPayment(_quote: PaymentRequired): Promise<PaymentPayload> {
  // TODO(W1–2): use the Starter Kit Payment skill / xrpl.js to build + sign a
  // presigned Payment tx blob for the quote, returning it as the payload.
  throw new Error("signPayment not implemented (W1–2 spike)");
}

async function main(): Promise<void> {
  const target = process.argv[2] ?? "http://localhost:8787/inference";
  const res = await payFor(target);
  console.log("[agent]", res.status, await res.text());
}

main().catch((err) => {
  console.error("[agent] failed:", err.message);
  process.exitCode = 1;
});
