import { createHash, randomUUID } from "node:crypto";
import { decode } from "ripple-binary-codec";
import type { Client, Wallet, Payment } from "xrpl";
import { X402_VERSION } from "./x402.js";
import type { PaymentPayload, PaymentRequirements } from "./types.js";

/** A 64-char uppercase hex InvoiceID derived from a fresh nonce (XRPL replay tag). */
export function makeInvoiceId(): string {
  return createHash("sha256").update(randomUUID()).digest("hex").toUpperCase();
}

/** Minimal shape of a decoded XRPL Payment (fields we check during verify). */
export interface DecodedPayment {
  TransactionType?: string;
  Account?: string;
  Destination?: string;
  Amount?: unknown;
  InvoiceID?: string;
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
  const invoiceId = (req.extra?.invoiceId as string | undefined) ?? undefined;

  const tx: Payment = {
    TransactionType: "Payment",
    Account: wallet.address,
    Destination: req.payTo,
    // XRP amount is a drops string; IOUs use an { currency, issuer, value } object.
    Amount: req.amount,
    ...(invoiceId ? { InvoiceID: invoiceId } : {}),
  };

  const prepared = await client.autofill(tx);
  const signed = wallet.sign(prepared);

  return {
    x402Version: X402_VERSION,
    accepted: req,
    payload: { txBlob: signed.tx_blob },
    ...(req.resource ? { resource: req.resource } : {}),
  };
}
