# scripts

Spike and operational scripts.

- **`spike-pay-endpoint.ts`** — the W1–2 milestone, **runnable today**. Funds two XRPL
  testnet wallets, builds a quote, has the agent presign a Payment, then verifies + settles
  it through the direct-XRPL facilitator — printing a real, validated on-ledger txid.

  ```bash
  pnpm --filter @payper/scripts spike
  ```

  Exercises the real `@payper/sdk` primitives (`signXrplPayment`, `DirectXrplFacilitator`).

- **`test-t54-testnet.ts`** — the same loop, but settled through the **live t54 testnet
  facilitator** over HTTP (`POST /verify` → `/settle`). `pnpm --filter @payper/scripts test:t54`.

- **`test-http-e2e.ts`** — full **W3–5 HTTP path**: a real Express server with the Payper
  middleware, driven end to end (402 quote → paid retry → on-ledger settle → replay rejected)
  through the live t54 facilitator. `pnpm --filter @payper/scripts test:e2e`.

  > Build workspace packages first: `pnpm --filter @payper/sdk --filter @payper/gateway build`.
