import type { NextFunction, Request, Response } from "express";
import {
  HEADERS,
  X402_VERSION,
  DEFAULT_SOURCE_TAG,
  makeInvoiceId,
  encodePaymentRequired,
  encodeSettleResponse,
  decodePaymentPayload,
  type Facilitator,
  type PaymentRequired,
  type PaymentRequirements,
} from "@payper/sdk";
import { InMemoryQuoteStore, type QuoteStore } from "./quote-store.js";

export interface PayperOptions {
  /** Amount in base units: drops for XRP, or issued-currency value for IOUs. */
  price: string;
  /** "XRP" or an issued-currency identifier (see `extra`). Defaults to "XRP". */
  asset?: string;
  /** Merchant XRPL account (r...) that receives the payment. */
  payTo: string;
  facilitator: Facilitator;
  /** x402 network id, e.g. "xrpl:0" (mainnet) or "xrpl:1" (testnet). */
  network: string;
  /** Quote lifetime in seconds (default 120). */
  maxTimeoutSeconds?: number;
  /** Where issued quotes are held; defaults to an in-memory store. */
  store?: QuoteStore;
}

/**
 * One-line x402 monetization for an Express route.
 *
 *   app.get("/inference", payper({ price: "10000", payTo, facilitator, network }), handler)
 *
 * Unpaid requests get a 402 + PAYMENT-REQUIRED quote (recorded in the store).
 * A retry carrying PAYMENT-SIGNATURE is validated against the STORED quote (not
 * the client-echoed one), verified + settled via the facilitator, consumed so it
 * can't be replayed, then passed through with a PAYMENT-RESPONSE (txid) header.
 */
export function payper(opts: PayperOptions) {
  const store = opts.store ?? new InMemoryQuoteStore();

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const sig = req.header(HEADERS.signature);

    // No payment yet -> issue and record a quote.
    if (!sig) {
      const requirements = requirementsFor(req, opts);
      store.put(requirements.extra!.invoiceId as string, requirements);
      const quote: PaymentRequired = { x402Version: X402_VERSION, accepts: [requirements] };
      res
        .status(402)
        .setHeader(HEADERS.required, encodePaymentRequired(quote))
        .json({ error: "payment required", ...quote });
      return;
    }

    // Paid retry -> validate against the quote WE issued, then verify + settle.
    const payload = decodePaymentPayload(sig);
    const invoiceId = payload.payload.invoiceId;
    const requirements = store.get(invoiceId);
    if (!requirements) {
      res.status(402).json({ error: "unknown or expired quote; request a new one" });
      return;
    }

    const facReq = {
      x402Version: X402_VERSION,
      paymentPayload: payload,
      paymentRequirements: requirements,
    };

    try {
      const verdict = await opts.facilitator.verify(facReq);
      if (!verdict.isValid) {
        res.status(402).json({ error: verdict.invalidReason ?? "invalid payment" });
        return;
      }

      const receipt = await opts.facilitator.settle(facReq);
      if (!receipt.success) {
        res.status(402).json({ error: receipt.errorReason ?? "settlement failed" });
        return;
      }

      store.consume(invoiceId);
      res.setHeader(HEADERS.response, encodeSettleResponse(receipt));
      next();
    } catch (err) {
      // Facilitator unreachable / unexpected error.
      res.status(502).json({ error: err instanceof Error ? err.message : "facilitator error" });
    }
  };
}

function requirementsFor(req: Request, o: PayperOptions): PaymentRequirements {
  return {
    scheme: "exact",
    network: o.network,
    amount: o.price,
    asset: o.asset ?? "XRP",
    payTo: o.payTo,
    maxTimeoutSeconds: o.maxTimeoutSeconds ?? 120,
    resource: req.path,
    extra: { invoiceId: makeInvoiceId(), sourceTag: DEFAULT_SOURCE_TAG },
  };
}
