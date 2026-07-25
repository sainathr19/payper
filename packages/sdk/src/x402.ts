import type { PaymentRequired, PaymentPayload, SettlementResponse } from "./types.js";

export const X402_VERSION = 2;

/**
 * Canonical x402 v2 header names.
 * See coinbase/x402 transports-v2: PAYMENT-REQUIRED / PAYMENT-SIGNATURE / PAYMENT-RESPONSE.
 */
export const HEADERS = {
  required: "PAYMENT-REQUIRED",
  signature: "PAYMENT-SIGNATURE",
  response: "PAYMENT-RESPONSE",
} as const;

const enc = (obj: unknown): string =>
  Buffer.from(JSON.stringify(obj), "utf8").toString("base64");
const dec = <T>(b64: string): T =>
  JSON.parse(Buffer.from(b64, "base64").toString("utf8")) as T;

export const encodePaymentRequired = (q: PaymentRequired): string => enc(q);
export const decodePaymentRequired = (b64: string): PaymentRequired =>
  dec<PaymentRequired>(b64);

export const encodePaymentPayload = (p: PaymentPayload): string => enc(p);
export const decodePaymentPayload = (b64: string): PaymentPayload =>
  dec<PaymentPayload>(b64);

export const encodeSettlementResponse = (r: SettlementResponse): string => enc(r);
export const decodeSettlementResponse = (b64: string): SettlementResponse =>
  dec<SettlementResponse>(b64);
