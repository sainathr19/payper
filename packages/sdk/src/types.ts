/**
 * x402 v2 wire types, specialized for the XRPL "exact" scheme as implemented by
 * t54's facilitator (https://xrpl-x402.t54.ai).
 *
 * Field names follow coinbase/x402 specs/x402-specification-v2.md. XRPL-specific
 * details (the presigned Payment blob, InvoiceID replay protection) live in the
 * scheme payload and `extra`.
 */

export type Scheme = "exact";

/**
 * x402 network identifier — CAIP-2 (`xrpl:{network_id}`), per t54's docs.
 * https://xrpl-x402.t54.ai/docs/xrpl-scheme#network-identifiers
 */
export const NETWORK = {
  mainnet: "xrpl:0",
  testnet: "xrpl:1",
  devnet: "xrpl:2",
} as const;
export type Network = (typeof NETWORK)[keyof typeof NETWORK];

/** Default XRPL SourceTag the facilitator expects in `extra.sourceTag`. */
export const DEFAULT_SOURCE_TAG = 804681468;

/** t54 XRPL x402 facilitator base URLs (the API host, distinct from the docs site). */
export const T54_FACILITATOR = {
  testnet: "https://xrpl-facilitator-testnet.t54.ai",
  mainnet: "https://xrpl-facilitator-mainnet.t54.ai",
  local: "http://127.0.0.1:8011",
} as const;

/** One accepted way to pay for a resource (the server's quote line item). */
export interface PaymentRequirements {
  scheme: Scheme;
  network: string;
  /** Amount in base units: drops for XRP, or issued-currency value for IOUs. */
  amount: string;
  /** "XRP", or an issued-currency identifier (see `extra` for currency/issuer). */
  asset: string;
  /** Destination XRPL account (r...) that receives the payment. */
  payTo: string;
  maxTimeoutSeconds: number;
  resource?: string;
  description?: string;
  /** Scheme-specific extras, e.g. `{ invoiceId }` and RLUSD currency/issuer. */
  extra?: Record<string, unknown>;
}

/** Body of the 402 response (base64 in the `PAYMENT-REQUIRED` header). */
export interface PaymentRequired {
  x402Version: number;
  accepts: PaymentRequirements[];
  error?: string;
}

/** XRPL "exact" scheme payload: the payer-signed, presigned Payment. */
export interface XrplExactPayload {
  /** Hex tx_blob of the signed XRPL Payment (from `wallet.sign(tx).tx_blob`). */
  signedTxBlob: string;
  /** The invoice id this payment is bound to (matches `accepted.extra.invoiceId`). */
  invoiceId: string;
}

/** Body of the `PAYMENT-SIGNATURE` header (base64). */
export interface PaymentPayload {
  x402Version: number;
  /** The chosen `PaymentRequirements` this payment satisfies. */
  accepted: PaymentRequirements;
  payload: XrplExactPayload;
  /** Optional structured resource descriptor (x402 v2 — an object, not a path). */
  resource?: Record<string, unknown>;
  extensions?: Record<string, unknown>;
}

/** Request body for both facilitator endpoints. */
export interface FacilitatorRequest {
  x402Version: number;
  paymentPayload: PaymentPayload;
  paymentRequirements: PaymentRequirements;
}

/** Response from `POST /verify`. */
export interface VerifyResponse {
  isValid: boolean;
  payer?: string;
  invalidReason?: string;
}

/** Response from `POST /settle` (also surfaced in the `PAYMENT-RESPONSE` header). */
export interface SettleResponse {
  success: boolean;
  /** Validated XRPL transaction hash. */
  transaction: string;
  network: string;
  payer?: string;
  errorReason?: string;
}
