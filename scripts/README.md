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

- **`test-rlusd-testnet.ts`** — **RLUSD (IOU) path**: stands up a local RLUSD issuer (Ripple's
  is mainnet-only), wires trust lines, funds the agent, and settles a `0.01 RLUSD` payment
  through the middleware — asserting the merchant's RLUSD balance.
  `pnpm --filter @payper/scripts test:rlusd`.

- **`test-indexer-testnet.ts`** — **W6–8 indexer**: subscribes to a merchant account, sends a
  payment, and asserts the settled payment is captured both live (stream) and via backfill.
  `pnpm --filter @payper/scripts test:indexer`.

- **`test-sse-testnet.ts`** — **dashboard data path**: spawns the real backend, connects an
  SSE client to `/stream`, sends a payment, and asserts it streams through (+ `/analytics`).
  `pnpm --filter @payper/scripts test:sse`.

  > Build workspace packages first, e.g.
  > `pnpm --filter @payper/sdk --filter @payper/gateway --filter @payper/backend build`.
