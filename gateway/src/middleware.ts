import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import {
  HEADERS,
  X402_VERSION,
  encodePaymentRequired,
  encodeSettlementResponse,
  decodePaymentPayload,
  type Asset,
  type Facilitator,
  type Network,
  type PaymentRequired,
} from "@payper/sdk";

export interface PayperOptions {
  /** Price in asset units, e.g. "0.01". */
  price: string;
  asset: Asset;
  /** Merchant XRPL account (r...) that receives the payment. */
  payTo: string;
  facilitator: Facilitator;
  network?: Network;
  /** Quote lifetime in seconds (default 120). */
  ttlSeconds?: number;
}

/**
 * One-line x402 monetization for an Express route.
 *
 *   app.get("/inference", payper({ price: "0.01", asset: rlusd, payTo, facilitator }), handler)
 *
 * Unpaid requests get a 402 + PAYMENT-REQUIRED quote. A retry carrying a valid
 * PAYMENT-SIGNATURE is verified + settled via the facilitator, then passed through
 * with a PAYMENT-RESPONSE (txid) header.
 */
export function payper(opts: PayperOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const sig = req.header(HEADERS.signature);

    // No payment yet → return a quote.
    if (!sig) {
      res
        .status(402)
        .setHeader(HEADERS.required, encodePaymentRequired(quoteFor(req, opts)))
        .json({ error: "payment required", x402Version: X402_VERSION });
      return;
    }

    // Payment present → verify + settle, then release the resource.
    const payload = decodePaymentPayload(sig);
    // NOTE: a real gateway looks the quote up by nonce (cache/store) rather than rebuilding it.
    const quote = quoteFor(req, opts);

    if (!(await opts.facilitator.verify(payload, quote))) {
      res.status(402).json({ error: "invalid payment" });
      return;
    }

    const receipt = await opts.facilitator.settle(payload, quote);
    if (!receipt.success) {
      res.status(402).json({ error: receipt.error ?? "settlement failed" });
      return;
    }

    res.setHeader(HEADERS.response, encodeSettlementResponse(receipt));
    next();
  };
}

function quoteFor(req: Request, o: PayperOptions): PaymentRequired {
  return {
    x402Version: X402_VERSION,
    asset: o.asset,
    amount: o.price,
    payTo: o.payTo,
    network: o.network ?? "mainnet",
    nonce: randomUUID(),
    expiry: Math.floor(Date.now() / 1000) + (o.ttlSeconds ?? 120),
    resource: req.path,
  };
}
