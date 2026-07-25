import type { PaymentPayload, PaymentRequired, SettlementResponse } from "./types.js";

/** Verify + settle an x402 payment. Implemented by t54, or a direct-XRPL fallback. */
export interface Facilitator {
  verify(payload: PaymentPayload, quote: PaymentRequired): Promise<boolean>;
  settle(payload: PaymentPayload, quote: PaymentRequired): Promise<SettlementResponse>;
}

/**
 * Client for t54's XRPL x402 facilitator (https://t54.ai).
 * The facilitator submits the payer's presigned Payment blob and returns the txid.
 */
export class T54Facilitator implements Facilitator {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey?: string,
  ) {}

  async verify(_payload: PaymentPayload, _quote: PaymentRequired): Promise<boolean> {
    // TODO(W1–2): POST `${this.baseUrl}/verify` — confirm the blob matches the quote.
    throw new Error("T54Facilitator.verify not implemented (W1–2 spike)");
  }

  async settle(_payload: PaymentPayload, _quote: PaymentRequired): Promise<SettlementResponse> {
    // TODO(W1–2): POST `${this.baseUrl}/settle` — submit the Payment, return txid.
    throw new Error("T54Facilitator.settle not implemented (W1–2 spike)");
  }
}
