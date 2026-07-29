# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Partner/developer operators running an x402 pay-per-call integration on Payper. They come to
a desktop console to answer operational questions: is money settling, how much volume/revenue,
which agents are paying, and did a specific payment go through. Secondary: developers wiring
an endpoint to Payper for the first time.

## Product Purpose
Payper turns any HTTP endpoint into a pay-per-call service for AI agents: one settled XRPL
payment (x402 scheme, RLUSD or XRP) per API call, verified and settled through the t54
facilitator. The console makes that continuous machine-to-machine settlement legible —
real-time feed, rolled-up analytics, per-transaction detail.

## Positioning
Per-call payments settled natively on the XRP Ledger via the x402 "exact" scheme with on-chain
invoice binding — not an off-chain metering/billing layer. Every dashboard number is backed by
a validated XRPL transaction the user can open in a block explorer.

## Operating Context
Operators watch a live SSE feed while autonomous agents pay in a loop. Backend indexer watches
merchant accounts on XRPL testnet and rolls settled Payments into analytics; the web app reads
`/analytics`, `/events`, and `/stream` from the backend (default `http://localhost:8787`).
Network is testnet today; explorer is `https://testnet.xrpl.org`.

## Capabilities and Constraints
- Real surfaces: Home (analytics + volume + live feed), Transactions (full settled-payment
  table), Marketplace (x402 service listings), Console (one-line integration).
- Data is read-only in the UI; the indexer counts only x402 settlements (filtered by the x402
  SourceTag). Amounts are XRP units or IOU values; assets are "XRP" or an issued-currency code
  (RLUSD = 40-hex `524C555344…`).
- No auth/login, wallets, API-key management, webhooks, or team surfaces in this build.
- Next.js (App Router) + React 18, plain CSS (no Tailwind). Backend/SDK are separate packages.

## Brand Commitments
Name: **Payper**. Mark: a water-drop glyph. Tagline: "the agent economy, on XRPL" / "One
settled XRPL payment per API call." Voice: precise, technical, understated — no hype. Visual
identity: a light, minimal operator console — warm off-white ground, monospace-for-data,
green-for-settled — rendered with free fonts (Space Grotesk + JetBrains Mono) and Payper's own
mark.

## Evidence on Hand
Live testnet data via the backend indexer (real validated txids, e.g. watched merchant
`r4m27i8LhAk3nZiN4ad8vU5bfMTnxueWX`). No fabricated customers, prices, or benchmarks. Marketplace
listings shown in this build are clearly-labeled sample services, not live offerings.

## Product Principles
1. Every number traces to a real on-chain transaction; nothing is mocked silently.
2. The tool disappears into the operator's task — scan, verify, move on.
3. Data is monospace and exact; chrome is quiet.
4. Real-time by default: the feed and tiles move as settlements land.
5. Honest about network and status (testnet pill, sample labels).
