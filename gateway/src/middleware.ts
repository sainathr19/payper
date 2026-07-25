import type { NextFunction, Request, Response } from "express";
import {
  HEADERS,
  X402_VERSION,
  makeInvoiceId,
  encodePaymentRequired,
  encodeSettleResponse,
  decodePaymentPayload,
  type Facilitator,
  type PaymentRequired,
  type PaymentRequirements,
} from "@payper/sdk";

export interface PayperOptions {
  /** Amount in base units: drops for XRP, or issued-currency value for IOUs. */
  price: string;
  /** "XRP" or an issued-currency identifier (see `extra`). Defaults to "XRP". */
  asset?: string;
  /** Merchant XRPL account (r...) that receives the payment. */
  payTo: string;
  facilitator: Facilitator;
  /** x402 network id, e.g. "xrpl-mainnet". */
  network: string;
  /** Quote lifetime in seconds (default 120). */
  maxTimeoutSeconds?: number;
}

/**
 * One-line x402 monetization for an Express route.
 *
 *   app.get("/inference", payper({ price: "10000", payTo, facilitator, network }), handler)
 *
 * Unpaid requests get a 402 + PAYMENT-REQUIRED quote. A retry carrying a valid
 * PAYMENT-SIGNATURE is verified + settled via the facilitator, then passed through
 * with a PAYMENT-RESPONSE (txid) header.
 */
export function payper(opts: PayperOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const sig = req.header(HEADERS.signature);

    // No payment yet -> return a quote.
    if (!sig) {
      const quote: PaymentRequired = {
        x402Version: X402_VERSION,
        accepts: [requirementsFor(req, opts)],
      };
      res
        .status(402)
        .setHeader(HEADERS.required, encodePaymentRequired(quote))
        .json({ error: "payment required", ...quote });
      return;
    }

    // Payment present -> verify + settle, then release the resource.
    const payload = decodePaymentPayload(sig);
    // NOTE: the demo trusts the echoed `accepted`; a real gateway looks the quote
    // up by invoiceId (extra.invoiceId) to prevent price tampering.
    const requirements = payload.accepted;
    const facReq = {
      x402Version: X402_VERSION,
      paymentPayload: payload,
      paymentRequirements: requirements,
    };

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

    res.setHeader(HEADERS.response, encodeSettleResponse(receipt));
    next();
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
    extra: { invoiceId: makeInvoiceId() },
  };
}
