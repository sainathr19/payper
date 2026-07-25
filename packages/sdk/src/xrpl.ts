import { createHash, randomUUID } from "node:crypto";
import { decode } from "ripple-binary-codec";
import type { Client, Wallet, Payment } from "xrpl";
import { X402_VERSION } from "./x402.js";
import { DEFAULT_SOURCE_TAG } from "./types.js";
import type { PaymentPayload, PaymentRequirements } from "./types.js";

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
 * Build, autofill, and sign an XRPL Payment for a quote, returning the x402
 * PaymentPayload the facilitator settles. XRP only for the W1–2 spike; IOU
 * (RLUSD) amounts follow once the trust-line flow is wired.
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
    // XRP amount is a drops string; IOUs use an { currency, issuer, value } object.
    Amount: req.amount,
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
