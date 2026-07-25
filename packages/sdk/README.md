# @payper/sdk

Shared building blocks used by every Payper package.

- **`types.ts`** — x402 v2 wire objects for the XRPL "exact" scheme: `PaymentRequirements`,
  `PaymentRequired`, `PaymentPayload` (with `XrplExactPayload`), and the facilitator
  `FacilitatorRequest` / `VerifyResponse` / `SettleResponse`. Field names follow
  [coinbase/x402 v2](https://github.com/coinbase/x402/blob/main/specs/x402-specification-v2.md).
- **`x402.ts`** — canonical v2 header names (`PAYMENT-REQUIRED` / `PAYMENT-SIGNATURE` /
  `PAYMENT-RESPONSE`) and base64 codecs.
- **`xrpl.ts`** — `signXrplPayment()` (build + autofill + sign a presigned Payment →
  `PaymentPayload`, XRP **or** RLUSD/IOU), `amountFromRequirements()`, `ensureTrustLine()`
  (RLUSD onboarding), `RLUSD_CURRENCY`, `decodePaymentBlob()`, and `makeInvoiceId()`.
- **`facilitator.ts`** — the `Facilitator` interface with two implementations:
  - **`T54Facilitator`** — posts to t54's `/verify` and `/settle`
    ([xrpl-x402.t54.ai](https://xrpl-x402.t54.ai)).
  - **`DirectXrplFacilitator`** — the fallback: structurally verifies the presigned
    Payment against the quote, then submits it to the ledger via `xrpl.js`. Runnable on
    testnet today (see `scripts/spike-pay-endpoint.ts`).

Gateway, backend, and agent all depend on this package (`@payper/sdk`).

Confirmed against t54's [XRPL scheme docs](https://xrpl-x402.t54.ai/docs/xrpl-scheme):
payload field `payload.signedTxBlob`; CAIP-2 networks (`xrpl:0/1/2`); required
`extra.invoiceId` + `extra.sourceTag` (default `804681468`); invoice binding
`InvoiceID = SHA256(invoiceId)`; facilitator hosts `xrpl-facilitator-{testnet,mainnet}.t54.ai`.
t54 also ships an official `x402-xrpl` TS/Python middleware package.

> **Verified live:** both facilitator paths settle on testnet on-ledger — the direct-XRPL
> fallback (`scripts/spike-pay-endpoint.ts`) and the real t54 facilitator
> (`scripts/test-t54-testnet.ts`, `POST /verify` → `/settle`). The XRPL `payload` must carry
> `{ signedTxBlob, invoiceId }` — t54's docs example omits `invoiceId`, but the service requires it.
