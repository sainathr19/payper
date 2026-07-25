# @payper/backend

The off-chain services that make on-chain activity legible.

- **`registry.ts`** — Services and their priced Endpoints (in-memory stub → real store).
- **`indexer.ts`** — subscribes to rippled / queries Clio for `Payment`s to merchant
  accounts; reconciles `nonce -> txid -> usage`.
- **`analytics.ts`** — rolls ledger events into revenue, paying-agent counts, tx volume.
- **`server.ts`** — Express API: `/services` (marketplace) and `/analytics` (dashboard feed).
