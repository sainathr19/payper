import { createHash, randomUUID } from "node:crypto";
import { decode } from "ripple-binary-codec";
import type { Amount, Client, Wallet, Payment, TrustSet } from "xrpl";
import { X402_VERSION } from "./x402.js";
import { DEFAULT_SOURCE_TAG } from "./types.js";
import type { PaymentPayload, PaymentRequirements } from "./types.js";

/** RLUSD's canonical 40-hex XRPL currency code. */
export const RLUSD_CURRENCY = "524C555344000000000000000000000000000000";

/** A fresh, unique invoice identifier for `extra.invoiceId`. */
export function makeInvoiceId(): string {
  return `INV-${randomUUID()}`;
}

/**
 * The value for the transaction's `InvoiceID` field, binding it to the invoice.
 * t54 requires `InvoiceID = SHA256(invoiceId)` (or a Memo binding) to stop replay.
 * https://xrpl-x402.t54.ai/docs/xrpl-scheme#invoice-binding
 */
export function invoiceBindingHash(invoiceId: string): string {
  return createHash("sha256").update(invoiceId).digest("hex").toUpperCase();
}

/**
 * The XRPL Payment `Amount` for a quote: a drops string for XRP, or an
 * `{ currency, issuer, value }` object for an IOU (asset + `extra.issuer`).
 */
export function amountFromRequirements(req: PaymentRequirements): Amount {
  if (req.asset === "XRP") return req.amount; // drops string
  const issuer = req.extra?.issuer as string | undefined;
  if (!issuer) throw new Error("IOU requirements.extra.issuer is required");
  return { currency: req.asset, issuer, value: req.amount };
}

/** Minimal shape of a decoded XRPL Payment (fields we check during verify). */
export interface DecodedPayment {
  TransactionType?: string;
  Account?: string;
  Destination?: string;
  Amount?: unknown;
  InvoiceID?: string;
  SourceTag?: number;
}

/** Decode a signed `tx_blob` back into transaction fields. */
export function decodePaymentBlob(txBlob: string): DecodedPayment {
  return decode(txBlob) as unknown as DecodedPayment;
}

/**
 * Ensure `wallet` holds a trust line to `issuer` for `currency`, creating one if
 * absent. This is the RLUSD onboarding step for both services and agents.
 */
export async function ensureTrustLine(
  client: Client,
  wallet: Wallet,
  currency: string,
  issuer: string,
  limit = "1000000000",
): Promise<void> {
  const lines = await client.request({
    command: "account_lines",
    account: wallet.address,
    peer: issuer,
  });
  const has = lines.result.lines.some(
    (l) => l.currency.toUpperCase() === currency.toUpperCase(),
  );
  if (has) return;

  const tx: TrustSet = {
    TransactionType: "TrustSet",
    Account: wallet.address,
    LimitAmount: { currency, issuer, value: limit },
  };
  const prepared = await client.autofill(tx);
  const signed = wallet.sign(prepared);
  await client.submitAndWait(signed.tx_blob);
}

/**
 * Build, autofill, and sign an XRPL Payment for a quote, returning the x402
 * PaymentPayload the facilitator settles. Handles XRP (drops) and IOU (RLUSD).
 */
export async function signXrplPayment(
  client: Client,
  wallet: Wallet,
  req: PaymentRequirements,
): Promise<PaymentPayload> {
  const invoiceId = req.extra?.invoiceId as string | undefined;
  if (!invoiceId) throw new Error("requirements.extra.invoiceId is required");
  const sourceTag = (req.extra?.sourceTag as number | undefined) ?? DEFAULT_SOURCE_TAG;

  const tx: Payment = {
    TransactionType: "Payment",
    Account: wallet.address,
    Destination: req.payTo,
    Amount: amountFromRequirements(req),
    SourceTag: sourceTag,
    InvoiceID: invoiceBindingHash(invoiceId),
  };

  const prepared = await client.autofill(tx);
  const signed = wallet.sign(prepared);

  return {
    x402Version: X402_VERSION,
    accepted: req,
    payload: { signedTxBlob: signed.tx_blob, invoiceId },
  };
}
