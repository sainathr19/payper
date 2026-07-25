# @payper/gateway

The developer-facing monetization layer.

- **`middleware.ts`** — `payper(opts)`, the one-line Express middleware. Emits a `402`
  quote for unpaid requests; verifies + settles paid retries via the facilitator; releases
  the response with a `PAYMENT-RESPONSE` (txid) header.
- **`server.ts`** — a demo host wrapping a single `/inference` endpoint end to end.

**Roadmap:** a hosted reverse proxy (config-driven) so non-Node stacks get x402 in front of
any upstream, and a quote store keyed by `nonce` (the demo rebuilds the quote for brevity).
