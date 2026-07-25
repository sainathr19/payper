# Payper — UI Inspiration & Design Direction

A curated reference set for Payper's interface. For each product: the **link**, what
screen to study, and **what to borrow**. Capture your own screenshots into
`docs/inspiration/` (see the folder's README) and reference them next to each entry.

> Note: we don't commit other products' screenshots (copyright). Links + notes here;
> your own captures live in `docs/inspiration/` for private design reference.

---

## 1. Developer payments / dashboards (the core model)
| Product | Link | Study | Borrow for Payper |
|---------|------|-------|-------------------|
| **Stripe** | https://dashboard.stripe.com | Payments dashboard, revenue graph, event log | The "revenue + live event feed" layout; clean money numbers; the *"one line of code"* onboarding framing |
| **Stripe Docs** | https://docs.stripe.com | API-first docs, copy-paste snippets | Developer console DX; "wrap your endpoint" quickstart |
| **Vercel** | https://vercel.com/dashboard | Project + usage analytics | Usage/analytics cards, clean dev-tool aesthetic |

## 2. Usage & API analytics
| Product | Link | Study | Borrow for Payper |
|---------|------|-------|-------------------|
| **Cloudflare** | https://dash.cloudflare.com | Requests/traffic analytics | Request-volume charts, real-time counters |
| **PostHog** | https://posthog.com | Event stream, live events | The live event feed component (settled-payment stream) |
| **Helicone / OpenRouter** | https://openrouter.ai | Per-model/API usage + cost | Per-endpoint cost & usage tables (closest analog to per-endpoint revenue) |

## 3. Marketplaces / directories
| Product | Link | Study | Borrow for Payper |
|---------|------|-------|-------------------|
| **RapidAPI** | https://rapidapi.com | API marketplace, listing cards | Service listing cards, pricing display, category browse |
| **OpenRouter models** | https://openrouter.ai/models | Model directory + price/token | Machine-readable pricing surfaced cleanly; filter/sort UX |

## 4. Crypto / on-chain activity views
| Product | Link | Study | Borrow for Payper |
|---------|------|-------|-------------------|
| **XRPScan** | https://xrpscan.com | Live XRPL tx feed, account activity | The real-time on-chain payment feed; txid linking |
| **Basescan / x402 dashboards** | https://basescan.org | On-chain activity counters | Cumulative tx / volume counters for the "agent economy" hero |
| **Dune** | https://dune.com | Dashboard composition | Metric cards, time-series styling for volume over time |

## 5. Agent / AI-native UX
| Product | Link | Study | Borrow for Payper |
|---------|------|-------|-------------------|
| **Ripple XRPL AI Starter Kit** | https://ripple.com/insights/xrpl-ai-starter-kit/ | The official agent-payment flow | Terminology + the agent-pays-autonomously demo framing |
| **Coinbase x402** | https://www.coinbase.com/developer-platform/discover/launches/x402 | The x402 protocol explainer | How to explain "402 → pay → 200" to a non-expert judge |

---

## Design direction

**Theme:** "the machine economy, made visible" — precise, fast, developer-grade, a little alive.
- **Palette:** near-black/ink base with a clean light mode; one electric accent (e.g. XRPL-blue
  or a vivid cyan) for money/success; green for settled payments. Restrained, not degen-neon.
- **Motion:** payments *land* — a settled payment animates into the live feed; counters roll up as
  volume accrues. Tasteful (Framer Motion). The live feed ticking is the emotional core of the demo.
- **Typography:** a precise grotesque with strong tabular figures (Inter / Geist) so amounts, tx
  counts, and prices read crisply; larger display weight for the cumulative-volume hero number.

**Key screens to design (in priority order):**
1. **Live dashboard / "agent economy"** — cumulative on-chain volume hero, revenue, paying agents,
   and a real-time settled-payment feed (txids linking to XRPScan). *This is the demo.* (Stripe + XRPScan + PostHog)
2. **Developer console** — register service, connect wallet, RLUSD trust line, wrap endpoint with the
   one-line snippet + copy button. (Stripe Docs)
3. **Per-endpoint analytics** — revenue, calls, avg price, top agents for a single endpoint. (Helicone/Cloudflare)
4. **Marketplace** — browse/search x402-priced services; listing cards with price + manifest. (RapidAPI/OpenRouter)
5. **Agent activity view** — a single agent's spend feed (great for the autonomous-agent demo). (XRPScan)
6. (Stretch) **Streaming/Payment-Channel view** — batched claims vs. on-ledger settles.

**Component kit suggestion:** Next.js + Tailwind + **shadcn/ui**, **Recharts** (or visx) for
charts, **Framer Motion** for motion. Polished, non-templated look fast — and the `frontend-design`
skill can push the visual identity beyond defaults.

---

## How to add your own captures
1. Capture the screens above (your browser / a tool like Shottr or CleanShot).
2. Save as `docs/inspiration/<product>-<screen>.png` (e.g. `stripe-event-feed.png`).
3. Reference inline here, e.g. `![Stripe event feed](inspiration/stripe-event-feed.png)`.
These are for private design reference; keep them out of any public marketing.
