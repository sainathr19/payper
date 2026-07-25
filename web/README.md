# @payper/web

Next.js (App Router) frontend.

- **`app/page.tsx`** — **live Dashboard**: stat cards (settled payments, paying agents,
  revenue per asset) plus a real-time settled-payment feed. On load it fetches `/analytics`
  and `/events`, then subscribes to the backend's `/stream` (SSE) — new payments animate in,
  with txids linking to the XRPL explorer and a live/reconnecting status badge.
- **`app/marketplace/page.tsx`** — browse x402-priced services.
- **`app/console/page.tsx`** — developer console: register a service, wrap an endpoint.
- **`lib/api.ts`** — backend client + SSE subscription + formatting helpers.

```bash
# point the dashboard at the backend (default http://localhost:8787)
NEXT_PUBLIC_API_URL=http://localhost:8787 pnpm --filter @payper/web dev
```

The live data path (backend `/stream` → dashboard) is covered by
`scripts/test-sse-testnet.ts` (`pnpm --filter @payper/scripts test:sse`).
