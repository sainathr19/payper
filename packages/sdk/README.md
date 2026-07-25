# @payper/sdk

Shared building blocks used by every Payper package.

- **`types.ts`** — the x402 wire objects: `PaymentRequired`, `PaymentPayload`, `SettlementResponse`, `Asset`.
- **`x402.ts`** — canonical v2 header names (`PAYMENT-REQUIRED` / `PAYMENT-SIGNATURE` / `PAYMENT-RESPONSE`) and base64 codecs.
- **`facilitator.ts`** — the `Facilitator` interface and the `T54Facilitator` client ([t54.ai](https://t54.ai)); a direct-XRPL fallback implements the same interface.

Gateway, backend, and agent all depend on this package (`@payper/sdk`).
