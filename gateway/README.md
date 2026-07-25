# @payper/gateway

The developer-facing monetization layer.

- **`middleware.ts`** — `payper(opts)`, the one-line Express middleware. Emits a `402`
  quote for unpaid requests; on the paid retry it validates against the quote it originally
  issued (not the client-echoed terms), verifies + settles via the facilitator, consumes the
  quote, and releases the response with a `PAYMENT-RESPONSE` (txid) header.
- **`quote-store.ts`** — `QuoteStore` interface + `InMemoryQuoteStore`. Holds issued quotes
  by `invoiceId` with expiry and single-use consumption (stops price tampering + replay).
  Swap for Redis behind the same interface for multi-instance deploys.
- **`server.ts`** — a demo host wrapping a single `/inference` endpoint.

**Proven end to end over HTTP** against the live t54 testnet facilitator — see
`scripts/test-http-e2e.ts` (`pnpm --filter @payper/scripts test:e2e`): a 402 quote, a paid
retry that settles on-ledger, and a replay of the same quote correctly rejected.

**Roadmap:** a hosted reverse proxy (config-driven) so non-Node stacks get x402 in front of
any upstream.
