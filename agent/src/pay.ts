import type { Client, Wallet } from "xrpl";
import {
  HEADERS,
  RLUSD_CURRENCY,
  decodePaymentRequired,
  decodeSettleResponse,
  encodePaymentPayload,
  ensureTrustLine,
  signXrplPayment,
  type PaymentRequirements,
  type SettleResponse,
} from "@payper/sdk";

/** Outcome of a single pay-per-call attempt against an x402 resource. */
export interface PayResult {
  /** HTTP status of the paid (second) request. */
  status: number;
  /** The quote the agent paid, when a 402 was issued. */
  requirements?: PaymentRequirements;
  /** Decoded PAYMENT-RESPONSE receipt (present on a settled 200). */
  receipt?: SettleResponse;
  /** Validated XRPL transaction hash, when settled. */
  txid?: string;
  /** Testnet explorer link for `txid`, when settled. */
  explorer?: string;
  /** Parsed JSON body of the paid response (best-effort). */
  body?: unknown;
}

/** True once the agent holds the trust line an IOU quote is denominated in. */
const trusted = new Set<string>();

/**
 * Make sure `wallet` can hold the asset a quote is priced in. XRP needs nothing;
 * an IOU (e.g. RLUSD) needs a trust line to its issuer before a Payment can send
 * it. We only issue the TrustSet once per (asset, issuer) for the process.
 */
async function ensureAssetTrust(
  client: Client,
  wallet: Wallet,
  req: PaymentRequirements,
): Promise<void> {
  if (req.asset === "XRP") return;
  const issuer = req.extra?.issuer as string | undefined;
  if (!issuer) throw new Error("IOU quote missing extra.issuer");

  const currency = req.asset === "RLUSD" ? RLUSD_CURRENCY : req.asset;
  const key = `${currency}:${issuer}`;
  if (trusted.has(key)) return;

  await ensureTrustLine(client, wallet, currency, issuer);
  trusted.add(key);
}

/**
 * Discover and pay for one call to an x402 resource, mirroring the XRPL AI
 * Starter Kit's Payment skill:
 *
 *   1. GET the resource → 402 + PAYMENT-REQUIRED quote (or a non-402 to pass through).
 *   2. Sign an XRPL Payment for the quoted terms (trust line first for IOUs).
 *   3. Retry with PAYMENT-SIGNATURE → 200 + PAYMENT-RESPONSE (settled txid).
 */
export async function payFor(
  url: string,
  client: Client,
  wallet: Wallet,
): Promise<PayResult> {
  const first = await fetch(url);
  if (first.status !== 402) {
    return { status: first.status, body: await safeJson(first) };
  }

  const quoteB64 = first.headers.get(HEADERS.required);
  if (!quoteB64) throw new Error("402 response missing PAYMENT-REQUIRED header");

  const quote = decodePaymentRequired(quoteB64);
  const requirements = quote.accepts[0];
  if (!requirements) throw new Error("quote had no acceptable payment requirements");

  await ensureAssetTrust(client, wallet, requirements);

  const payload = await signXrplPayment(client, wallet, requirements);
  const paid = await fetch(url, {
    headers: { [HEADERS.signature]: encodePaymentPayload(payload) },
  });

  const result: PayResult = {
    status: paid.status,
    requirements,
    body: await safeJson(paid),
  };

  const receiptB64 = paid.headers.get(HEADERS.response);
  if (receiptB64) {
    const receipt = decodeSettleResponse(receiptB64);
    result.receipt = receipt;
    result.txid = receipt.transaction;
    result.explorer = `https://testnet.xrpl.org/transactions/${receipt.transaction}`;
  }

  return result;
}

/** Read a response body as JSON, falling back to text, never throwing. */
async function safeJson(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
