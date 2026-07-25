/**
 * x402 asset: XRP (native) or an issued currency such as RLUSD.
 * For RLUSD, `currency` is the 160-bit hex code and `issuer` is Ripple's r-address.
 */
export type Asset =
  | { kind: "XRP" }
  | { kind: "ISSUED"; currency: string; issuer: string };

export type Network = "mainnet" | "testnet" | "devnet";

/** Contents of the 402 `PAYMENT-REQUIRED` header — the server's quote. */
export interface PaymentRequired {
  x402Version: number;
  asset: Asset;
  /** Decimal string in asset units, e.g. "0.01". */
  amount: string;
  /** Merchant XRPL account (r...) that receives the payment. */
  payTo: string;
  network: Network;
  /** Unique per quote; ties the settled tx back to the request. */
  nonce: string;
  /** Unix seconds after which the quote is no longer valid. */
  expiry: number;
  resource?: string;
  description?: string;
}

/** Contents of the client's `PAYMENT-SIGNATURE` header. */
export interface PaymentPayload {
  x402Version: number;
  nonce: string;
  /** A payer-signed, presigned XRPL Payment tx blob the facilitator submits. */
  signedTxBlob: string;
}

/** Contents of the server's `PAYMENT-RESPONSE` header (base64 SettlementResponse). */
export interface SettlementResponse {
  success: boolean;
  /** Validated XRPL transaction hash, present on success. */
  txid?: string;
  ledgerIndex?: number;
  error?: string;
}
