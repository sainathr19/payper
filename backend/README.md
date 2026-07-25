# @payper/backend

The off-chain services that make on-chain activity legible.

- **`registry.ts`** — Services and their priced Endpoints (in-memory stub → real store).
- **`indexer.ts`** — `Indexer` subscribes to the XRPL transaction stream for watched merchant
  accounts and surfaces settled inbound `Payment`s as `LedgerEvent`s (XRP + IOU). `backfill()`
  replays recent history via `account_tx` so the dashboard isn't empty on load. Proven on
  testnet — `scripts/test-indexer-testnet.ts`.
- **`analytics.ts`** — `AnalyticsStore` rolls events into tx count, paying-agent count, and
  revenue per asset; dedupes by txid (backfill + live stream overlap); serves a recent feed.
- **`server.ts`** — Express API: `/services` (marketplace), `/analytics`, `/events`, and
  `/stream` (Server-Sent Events, one message per settled payment). Set `WATCH_ACCOUNTS`
  (comma-separated r-addresses) and `XRPL_ENDPOINT` to start indexing.
