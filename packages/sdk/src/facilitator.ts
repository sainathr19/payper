import type { Client } from "xrpl";
import type {
  FacilitatorRequest,
  SettleResponse,
  VerifyResponse,
} from "./types.js";
import { decodePaymentBlob, invoiceBindingHash } from "./xrpl.js";

/** Verify + settle an x402 payment. Implemented by t54, or the direct-XRPL fallback. */
export interface Facilitator {
  verify(req: FacilitatorRequest): Promise<VerifyResponse>;
  settle(req: FacilitatorRequest): Promise<SettleResponse>;
}

/**
 * Client for t54's XRPL x402 facilitator (https://xrpl-x402.t54.ai).
 * Standard x402 v2 shape: POST /verify and /settle with
 * { x402Version, paymentPayload, paymentRequirements }.
 */
export class T54Facilitator implements Facilitator {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey?: string,
  ) {}

  private async post<T>(path: string, body: FacilitatorRequest): Promise<T> {
    const res = await fetch(new URL(path, this.baseUrl), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`t54 ${path} -> ${res.status} ${await res.text()}`);
    return (await res.json()) as T;
  }

  verify(req: FacilitatorRequest): Promise<VerifyResponse> {
    return this.post<VerifyResponse>("/verify", req);
  }

  settle(req: FacilitatorRequest): Promise<SettleResponse> {
    return this.post<SettleResponse>("/settle", req);
  }
}

/**
 * Direct-XRPL fallback: no external facilitator. Structurally verifies the
 * presigned Payment against the quote, then submits it to the ledger itself.
 * Runnable on testnet today; used when t54 is unavailable/rate-limited.
 *
 * NOTE: verify does structural checks (type, destination, amount, invoiceId).
 * The signature is enforced by the ledger at submit time; a production verify
 * should also validate the signature offline before settling.
 */
export class DirectXrplFacilitator implements Facilitator {
  constructor(private readonly client: Client) {}

  async verify(req: FacilitatorRequest): Promise<VerifyResponse> {
    const { paymentRequirements: q, paymentPayload: p } = req;
    const tx = decodePaymentBlob(p.payload.signedTxBlob);

    const fail = (reason: string): VerifyResponse => ({
      isValid: false,
      invalidReason: reason,
      payer: tx.Account,
    });

    if (tx.TransactionType !== "Payment") return fail("not a Payment transaction");
    if (tx.Destination !== q.payTo) return fail("destination does not match payTo");

    // XRP amount is a drops string; IOU amounts are { currency, issuer, value }.
    if (typeof tx.Amount === "string") {
      if (BigInt(tx.Amount) < BigInt(q.amount)) return fail("amount below quote");
    } else if (tx.Amount && typeof tx.Amount === "object") {
      const amt = tx.Amount as { currency?: string; issuer?: string; value?: string };
      const wantIssuer = q.extra?.issuer as string | undefined;
      if (q.asset !== "XRP" && amt.currency?.toUpperCase() !== q.asset.toUpperCase()) {
        return fail("currency does not match asset");
      }
      if (wantIssuer && amt.issuer !== wantIssuer) return fail("issuer mismatch");
      if (Number(amt.value ?? "0") < Number(q.amount)) return fail("amount below quote");
    } else {
      return fail("unrecognized amount");
    }

    // Invoice binding: InvoiceID must equal SHA256(invoiceId).
    const invoiceId = q.extra?.invoiceId as string | undefined;
    if (invoiceId && tx.InvoiceID !== invoiceBindingHash(invoiceId)) {
      return fail("invoice binding mismatch");
    }

    return { isValid: true, payer: tx.Account };
  }

  async settle(req: FacilitatorRequest): Promise<SettleResponse> {
    const blob = req.paymentPayload.payload.signedTxBlob;
    const tx = decodePaymentBlob(blob);
    const result = await this.client.submitAndWait(blob);
    const meta = result.result.meta;
    const code =
      meta && typeof meta === "object" && "TransactionResult" in meta
        ? (meta as { TransactionResult: string }).TransactionResult
        : "unknown";

    const success = code === "tesSUCCESS";
    return {
      success,
      transaction: result.result.hash,
      network: req.paymentRequirements.network,
      payer: tx.Account,
      ...(success ? {} : { errorReason: code }),
    };
  }
}
