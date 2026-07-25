# @payper/sdk

Shared building blocks used by every Payper package.

- **`types.ts`** — x402 v2 wire objects for the XRPL "exact" scheme: `PaymentRequirements`,
  `PaymentRequired`, `PaymentPayload` (with `XrplExactPayload`), and the facilitator
  `FacilitatorRequest` / `VerifyResponse` / `SettleResponse`. Field names follow
  [coinbase/x402 v2](https://github.com/coinbase/x402/blob/main/specs/x402-specification-v2.md).
- **`x402.ts`** — canonical v2 header names (`PAYMENT-REQUIRED` / `PAYMENT-SIGNATURE` /
  `PAYMENT-RESPONSE`) and base64 codecs.
- **`xrpl.ts`** — `signXrplPayment()` (build + autofill + sign a presigned Payment →
  `PaymentPayload`), `decodePaymentBlob()`, and `makeInvoiceId()` (replay tag).
- **`facilitator.ts`** — the `Facilitator` interface with two implementations:
  - **`T54Facilitator`** — posts to t54's `/verify` and `/settle`
    ([xrpl-x402.t54.ai](https://xrpl-x402.t54.ai)).
  - **`DirectXrplFacilitator`** — the fallback: structurally verifies the presigned
    Payment against the quote, then submits it to the ledger via `xrpl.js`. Runnable on
    testnet today (see `scripts/spike-pay-endpoint.ts`).

Gateway, backend, and agent all depend on this package (`@payper/sdk`).

> **W1–2 TODO:** confirm the exact XRPL payload field name and `network` string t54 expects
> against its `/supported` + `/docs`; the direct path is proven, the t54 path is wired but
> unverified against a live facilitator.
