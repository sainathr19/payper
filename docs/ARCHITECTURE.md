# Payper — System Architecture

Payper is a **native XRPL** application (not the EVM sidechain). There are no smart
contracts — "logic" lives in a gateway + backend + frontend that orchestrate native XRPL
payments over the **x402** protocol. Settlement is delegated to **t54's XRPL x402
facilitator** (t54.ai); the ledger does custody and finality.

---

## Layers

```
┌─────────────────────────────────────────────────────────────┐
│  CLIENTS                                                      │
│  • AI agent (XRPL AI Starter Kit: Agent Wallet + Payment)    │
│  • Any x402-aware HTTP client                                │
└───────────────┬─────────────────────────────────────────────┘
                │ 1. GET /resource  → 402 (PAYMENT-REQUIRED)
                │ 2. GET /resource + PAYMENT-SIGNATURE
                ▼
┌─────────────────────────────────────────────────────────────┐
│  PAYPER GATEWAY  (Node/TS middleware + hosted proxy)        │
│  • Prices requests, emits 402 Quotes                        │
│  • Parses PAYMENT-SIGNATURE                                 │
│  • Delegates verify+settle to the facilitator              │
│  • Releases response + PAYMENT-RESPONSE (txid)             │
└───────┬──────────────────────────────────┬─────────────────┘
        │ verify + settle                    │ writes usage/receipts
        ▼                                    ▼
┌──────────────────────────┐   ┌──────────────────────────────┐
│  XRPL x402 FACILITATOR   │   │  PAYPER BACKEND (Node)       │
│  (t54 · t54.ai)          │   │  • Service/endpoint registry │
│  • verify signed payload │   │  • Indexer (rippled/Clio)    │
│  • settle XRP / RLUSD    │   │  • Revenue + analytics       │
└───────────┬──────────────┘   │  • Marketplace API           │
            │ submits Payment   └───────────────┬──────────────┘
            ▼                                    │ read indexed state
┌─────────────────────────────────────────────────────────────┐
│  XRPL MAINNET  (native)                                      │
│  Payment (XRP / RLUSD)  ·  TrustSet  ·  [PaymentChannel*]    │
└─────────────────────────────────────────────────────────────┘
                                                 ▲
┌────────────────────────────────────────────────┴────────────┐
│  FRONTEND  (Next.js + TypeScript)                            │
│  • Dashboard: revenue, paying agents, LIVE on-chain feed    │
│  • Marketplace: browse x402-priced services                 │
│  • Developer console: register service, wrap endpoint       │
└─────────────────────────────────────────────────────────────┘
```

---

## Components

### Gateway / SDK (`/gateway`, `/packages/sdk`)
- **Middleware** — one-line wrapper for Express/Next routes: prices a request, emits the
  `402` Quote, validates `PAYMENT-SIGNATURE`, delegates settlement, releases the response.
- **Hosted proxy** — for non-Node stacks: a reverse proxy that enforces x402 in front of any
  upstream, configured by a manifest.
- **Client SDK** — thin TS helper for building/parsing x402 headers and (optionally) paying
  (wraps the Starter Kit Payment skill).

### Backend (`/backend`)
- **Registry** — Services, Endpoints, prices, owner accounts.
- **Indexer** — subscribes to `rippled` / queries Clio for `Payment`s to merchant accounts;
  reconciles nonces → txids → usage.
- **Analytics** — revenue per endpoint/service, paying-agent counts, tx volume.
- **Marketplace API** — machine-readable listings/manifests agents can consume.

### Frontend (`/web`)
- **Dashboard** — position of the whole "agent economy": revenue, top agents, tx count, and a
  real-time settled-payment feed (the demo money shot).
- **Marketplace** — browse/search x402-priced services.
- **Developer console** — register a service, connect wallet, set RLUSD trust line, wrap endpoints.

### Reference agent (`/agent`)
- Autonomous consumer built on the Starter Kit (Agent Wallet + Payment skills) that discovers
  marketplace services and pays for them on a loop — generates continuous real on-chain volume.

### Shared (`/lib`)
- x402 header schema + parsing, XRPL amount/asset helpers, facilitator client + direct-`Payment`
  fallback, RLUSD currency/issuer config.

---

## Suggested repo layout
```
payper/
├── README.md
├── docs/
│   ├── SPEC.md
│   ├── ARCHITECTURE.md
│   ├── ui-inspiration.md
│   └── inspiration/        # drop UI reference captures here
├── web/                    # Next.js frontend (dashboard + marketplace + console)
├── gateway/                # x402 middleware + hosted proxy
├── backend/                # registry + indexer + analytics + marketplace API
├── agent/                  # autonomous reference agent (Starter Kit)
├── packages/sdk/           # client SDK + shared x402 helpers
└── scripts/                # mainnet spike scripts (W1–2)
```

---

## Data flow (monetize → pay → observe)
1. **Monetize:** developer registers a Service and wraps an Endpoint; gateway now emits `402` Quotes.
2. **Pay:** agent gets `402` → signs payment → retries with `PAYMENT-SIGNATURE` → facilitator settles
   an XRPL `Payment` → gateway returns `200` + `PAYMENT-RESPONSE` (txid).
3. **Observe:** indexer picks up the on-chain `Payment` → backend reconciles usage → dashboard streams
   the event (revenue, agent, txid) in real time.

---

## Settlement path & fallback
- **Primary:** t54's XRPL x402 facilitator ([t54.ai](https://t54.ai)) verifies and settles per request.
- **Fallback:** if the facilitator is unavailable/rate-limited, the gateway builds and submits a
  direct XRPL `Payment` itself (via `xrpl.js`), verifying the signed payload locally first.

---

## Trust model (be explicit)
Payper is **non-custodial** — it never holds user funds. Settlement is wallet-to-wallet
(agent → service) via the facilitator or a direct `Payment`; Payper verifies and records.
The gateway *is* trusted to release the paid resource after settlement (standard x402 trust
assumption between buyer and seller). Progressive decentralization (self-hosted facilitators,
on-chain receipts/attestations) is roadmap, not MVP.
