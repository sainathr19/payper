# 💧 Payper — Pay-per-call payments for AI agents on XRPL

> Monetize any API in one line. Agents pay **per request** in RLUSD or XRP over
> **x402**, settled natively on the XRP Ledger. Think **Stripe for the agent economy**.

Built for the **[Make Waves on XRPL](https://hackathons.xrpl-commons.org/hackathons/make-waves-041f8ce6)** buildathon (Jun 21 – Sep 21, 2026).

---

## The opportunity

The web's payment layer was never built for machines. AI agents now *want* to buy
things — API calls, inference, data, tools — but they can't hold a credit card or click
"subscribe." **x402** revives the dormant HTTP `402 Payment Required` status code so a
server can demand payment inline and an agent can pay it autonomously, no human, no API key.

Ripple just made XRPL a first-class x402 rail: the **[XRPL AI Starter Kit](https://ripple.com/insights/xrpl-ai-starter-kit/)**
(shipped Jun 10, 2026) provides an Agent Wallet skill, a Payment skill, and an MCP server, with
settlement handled by **[t54](https://t54.ai)**'s x402 facilitator on XRPL — agents pay in **XRP or RLUSD**
with no keys, accounts, or human. Momentum is real: Mastercard named Ripple a partner in its
**"Agent Pay for Machines"** network (Jun 2026), Ripple joined the **x402 Foundation** under the Linux
Foundation (Jul 2026), and **1.4M+ agentic transactions** have already settled through t54's XRPL
facilitator. The rail exists. **The developer layer on top doesn't.**

## What Payper does

Payper is the layer that makes agent payments *usable and visible*:

1. **Monetize** — wrap any API endpoint with one line of middleware (or point traffic at
   our hosted proxy). It instantly speaks x402: returns `402` with a price, hands settlement
   to the XRPL facilitator, releases the response on payment.
2. **Discover** — a marketplace of x402-priced services (inference, data, tools) that agents
   can browse and pay for.
3. **Observe** — a live dashboard of the on-chain agent economy: revenue per endpoint,
   paying agents, and a real-time feed of settled XRPL payments.
4. **Transact** — a reference autonomous agent (built on the Starter Kit) that discovers and
   pays for services on its own, generating continuous real on-chain volume.

Every API call becomes **one on-chain XRPL payment**. Developers get paid per use; agents
get frictionless access; the ledger gets measurable activity.

## Why XRPL

- **Sub-cent fees + 3–5s finality** — the only way per-call micropayments make economic sense.
- **RLUSD** — a stable unit to price services in, plus the institutional/Mastercard narrative.
- **Native x402 facilitator** — the **t54** ([t54.ai](https://t54.ai)) x402 facilitator on XRPL settles per request, no contracts.
- **Payment Channels** — a native off-ledger primitive for streaming/high-frequency scale.

## How it works (x402 in 20 seconds)

```
Agent ──GET /resource──▶ Payper gateway
Agent ◀─402 Payment Required (price, asset, pay-to)── gateway   [PAYMENT-REQUIRED header]
Agent ──GET /resource + signed payment──▶ gateway               [PAYMENT-SIGNATURE header]
                          gateway ──verify + settle──▶ XRPL facilitator ──▶ XRP Ledger
Agent ◀─────────200 OK + response───────── gateway
```

## Components (this repo)

- **Gateway / SDK** — drop-in x402 middleware + a hosted proxy for any stack; parses payment
  headers, prices requests, delegates settlement to the XRPL facilitator.
- **Dashboard** — live revenue + on-chain payment feed, per-endpoint analytics ("the agent economy").
- **Marketplace** — directory of x402-priced services agents can discover.
- **Reference agent** — autonomous consumer built on the Starter Kit's Agent Wallet + Payment skills.

## Documentation

- [`docs/SPEC.md`](docs/SPEC.md) — protocol & product spec (x402 flow, objects, settlement, MVP scope)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system architecture, components, data flow
- [`docs/ui-inspiration.md`](docs/ui-inspiration.md) — curated UI references & design direction

## Tech stack

- **Ledger:** XRPL Mainnet (native — *not* the EVM sidechain), Payments + RLUSD; Payment Channels (scale)
- **Rail:** Ripple XRPL AI Starter Kit (Agent Wallet skill, Payment skill, MCP server) + t54's x402 facilitator
- **SDK:** [`xrpl.js`](https://github.com/XRPLF/xrpl.js)
- **Settlement asset:** RLUSD (priced), XRP (fallback)
- **Frontend:** Next.js + TypeScript
- **Gateway:** Node/TS middleware + hosted proxy

## Roadmap

- [ ] **W1–2** — Starter Kit spike: one agent pays one endpoint via the facilitator on mainnet, end to end
- [ ] **W3–5** — Gateway middleware + SDK (one-line monetization); wrap first real service
- [ ] **W6–8** — Dashboard + live tx feed; seed marketplace (3–4 services); autonomous demo agent
- [ ] **W9–11** — Onboard 3–5 external builders; accumulate on-chain volume; polish
- [ ] **W12** — Demo, pitch, docs, submission

## Prize alignment (Make Waves)

Payper is built to score on the buildathon's actual metrics: **real users** (every developer
who wraps an endpoint) and **measurable on-chain activity** (one settled XRPL payment per call).
Runs on **mainnet** with **live primitives only** — no dependency on unreleased amendments.

## Status & disclaimer

🚧 Buildathon project, in active development. Not audited, not for production use. Agent-payment
settlement depends on t54's XRPL x402 facilitator; a direct-XRPL-payment fallback is planned
in case the facilitator is rate-limited or gated.

## License

MIT
