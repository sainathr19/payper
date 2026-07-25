# Payper — Protocol & Product Specification

> Pay-per-call payments for AI agents on XRPL. Monetize any API with x402; agents pay
> per request in RLUSD/XRP, settled natively on the XRP Ledger.

Status: **Draft / buildathon** · Network: **XRPL Mainnet** · SDK: **xrpl.js** · Rail: **XRPL AI Starter Kit (x402)**

---

## 1. Overview

Payper is a developer layer over the **x402** protocol on XRPL. A service wraps its
endpoints with Payper; when an agent (or any client) requests a paid resource, the
endpoint returns `402 Payment Required` with machine-readable payment terms. The client
signs a payment and retries; a **facilitator** verifies and settles it on the XRP Ledger;
the endpoint then returns the resource. Payper provides the three things the raw protocol
lacks: **one-line monetization (gateway/SDK)**, **discovery (marketplace)**, and
**observability (live dashboard)**.

The design goal is to run entirely on **live mainnet primitives** and Ripple's shipped
tooling — no dependency on unreleased amendments — and to maximize **on-chain activity**
(one settled payment per request) and **real users** (developers who monetize endpoints).

### Why now
- **x402** ([Coinbase spec](https://www.coinbase.com/developer-platform/discover/launches/x402)) revives HTTP `402` for inline, agent-native stablecoin payments.
- **[XRPL AI Starter Kit](https://ripple.com/insights/xrpl-ai-starter-kit/)** (Jun 10, 2026): an Agent Wallet skill, a Payment skill, and an MCP server, with settlement via **t54**'s ([t54.ai](https://t54.ai)) x402 facilitator on XRPL — agents pay in XRP or RLUSD with no keys/accounts/human.
- **Mastercard** named Ripple a partner in "Agent Pay for Machines" (Jun 2026), anchoring XRPL as the settlement layer; Ripple later joined the **x402 Foundation** under the Linux Foundation (Jul 2026), giving the standard neutral governance.
- **Traction:** 1.4M+ agentic transactions have already settled through t54's XRPL x402 facilitator (Virtuals.io named an ecosystem launch partner) — the rail is live, not theoretical.

---

## 2. The x402 request lifecycle

```
1. Client → GET /resource
2. Server → 402 Payment Required            (header: PAYMENT-REQUIRED)
             { asset, amount, payTo, network, nonce, expiry }
3. Client  → signs an XRPL payment for those terms
4. Client → GET /resource                   (header: PAYMENT-SIGNATURE = signed payload)
5. Server → facilitator.verify(payload)
6. Facilitator → submits/settles XRPL payment (XRP or RLUSD) → validated ledger
7. Server → 200 OK + resource               (header: PAYMENT-RESPONSE = SettlementResponse w/ txid)
```

- **PAYMENT-REQUIRED** — the server's quote: asset (`RLUSD` issuer/currency or `XRP`),
  amount, destination (the merchant's XRPL account or a Payper sub-address), network
  (`mainnet`), a nonce, and an expiry.
- **PAYMENT-SIGNATURE** — the client's signed payment payload the facilitator can settle.
- **PAYMENT-RESPONSE** — the x402 `SettlementResponse` (base64), carrying the settled XRPL `txid` so the client (and dashboard) can verify on-ledger.

---

## 3. Core objects (Payper model)

| Object | What it is |
|--------|------------|
| **Service** | A developer-registered API. Has an owner XRPL account + RLUSD trust line. |
| **Endpoint** | A priced route on a Service: `{ path, price, asset, description }`. |
| **Quote** | A `PAYMENT-REQUIRED` payload: asset, amount, payTo, nonce, expiry. |
| **Payment** | A settled XRPL transaction (XRP or RLUSD) tied to a request, keyed by nonce → txid. |
| **Agent** | A paying client with an XRPL wallet (Starter Kit Agent Wallet skill). |
| **Ledger event** | An indexed, on-chain payment surfaced in the dashboard/feed. |

On-chain, a Payment is a **native XRPL `Payment` transaction** — XRP, or **RLUSD**
(a trust-line/IOU token issued by Ripple). No custom ledger objects, no contracts.

---

## 4. Transactions & primitives used (all live on mainnet)

**Settlement**
- `Payment` — the per-request settlement (XRP or RLUSD). One per paid call.
- `TrustSet` — services/agents establish an RLUSD trust line (one-time onboarding step).

**Scale (roadmap, not MVP)**
- `PaymentChannelCreate` / `PaymentChannelClaim` — off-ledger streaming for high-frequency
  callers; many signed micro-claims batched into one on-ledger settlement. **Note:** this
  *reduces* on-chain tx count, so it is a scalability story, not the buildathon MVP.

**Facilitator**
- t54's XRPL x402 facilitator ([t54.ai](https://t54.ai)) performs verify + settle. Payper delegates to it,
  with a direct-`Payment` fallback if the facilitator is unavailable/rate-limited.

---

## 5. Core flows

### 5.1 Developer — monetize an endpoint
1. Register a Service (connect XRPL wallet, set RLUSD trust line if needed).
2. Wrap a route: `payper({ price: "0.01", asset: "RLUSD" })` (Express/Next middleware) — or
   point traffic at the hosted proxy with a config.
3. The route now returns `402` with a Quote for unpaid requests.

### 5.2 Agent — pay for a call
1. Agent requests the resource → gets `402` + Quote.
2. Agent's wallet (Starter Kit) signs a payment for the quoted terms.
3. Agent retries with `PAYMENT-SIGNATURE`; facilitator settles on XRPL; agent gets `200` + receipt.

### 5.3 Discovery
- Agent (or human) browses the marketplace; each listing exposes its endpoints, prices, and a
  machine-readable manifest an agent can consume directly.

### 5.4 Observe
- Indexer watches the merchant accounts on XRPL; the dashboard streams settled payments:
  revenue per endpoint, paying agents, tx count, live feed.

---

## 6. Settlement design (one real decision)

- **Default — direct per-request settlement.** One XRPL `Payment` per call. Simple, verifiable,
  and it **maximizes on-chain activity** (the prize metric). This is the MVP.
- **Asset — price in RLUSD, accept XRP.** RLUSD gives a stable pricing unit and the institutional
  narrative; XRP is the low-friction fallback. Both supported by the Starter Kit.
- **Scale — Payment Channels.** For streaming/high-frequency, batch off-ledger claims and settle
  periodically. Roadmap only (it lowers on-chain tx count).

---

## 7. MVP scope

**In:** gateway middleware + SDK (one-line monetization) · hosted proxy · RLUSD/XRP settlement
via the facilitator · live dashboard with on-chain payment feed + per-endpoint revenue · seeded
marketplace (3–4 services) · autonomous reference agent generating real volume.

**Stretch:** Payment-Channel streaming mode · multi-service developer accounts · usage-based
pricing tiers · agent spend policies/budgets · MCP endpoint so agents discover Payper services natively.

**Out (be explicit):** custody of user funds (settlement is wallet-to-wallet via the facilitator) ·
fiat on/off-ramp · non-XRPL settlement.

---

## 8. Prize alignment (Make Waves)

The buildathon rewards **real users** and **measurable on-chain activity** on a working product
(testnet/trial/mainnet accepted; prototypes excluded). Payper is engineered for both:

| Lever | How Payper scores |
|-------|-------------------|
| On-chain activity | 1 settled XRPL `Payment` per API call — compounds with traffic. |
| Users | Every developer who wraps an endpoint; plus paying agents. |
| Jury (best overall) | Dead-center on Ripple's flagship 2026 agentic-payments push (x402 + RLUSD + Mastercard). |
| Feasibility | Live mainnet primitives + shipped Starter Kit — zero unreleased-amendment risk. |

---

## 9. Open questions / to verify

- **x402 wire format — RESOLVED** against t54's [XRPL scheme docs](https://xrpl-x402.t54.ai/docs/xrpl-scheme):
  headers `PAYMENT-REQUIRED` / `PAYMENT-SIGNATURE` / `PAYMENT-RESPONSE`; scheme `"exact"`;
  CAIP-2 networks (`xrpl:0` mainnet / `xrpl:1` testnet / `xrpl:2` devnet); payload field
  `payload.signedTxBlob`; required `extra.invoiceId` + `extra.sourceTag` (default `804681468`);
  invoice binding `InvoiceID = SHA256(invoiceId)` or Memo; XRP amounts in drops, RLUSD asset
  `524C555344…` with `extra.issuer`. Verified end-to-end on testnet via the direct-XRPL path.
- **t54 facilitator — VERIFIED LIVE.** Hosts `xrpl-facilitator-{testnet,mainnet}.t54.ai`
  (official `x402-xrpl` middleware). `T54Facilitator` settles end-to-end against the testnet
  facilitator (`POST /verify` → `/settle` → on-ledger txid). Note: `payload` must carry
  `{ signedTxBlob, invoiceId }` (the docs example omits `invoiceId`). Still open: mainnet
  availability, rate limits, and auth. The direct-`Payment` fallback is also proven.
- **RLUSD (IOU) — WORKING on testnet.** Amount encoding (`{currency, issuer, value}`), the
  `524C…` currency code, and trust-line onboarding (`ensureTrustLine`) are implemented; a
  `0.01 RLUSD` payment settles through the middleware end-to-end (with a local issuer, since
  Ripple's RLUSD is mainnet-only). Still open: settle RLUSD through the **t54** facilitator
  (vs. the direct path), and confirm mainnet RLUSD issuer/trust-line UX.
- **xrpl.js** helpers used by the Starter Kit's Payment skill (versions, typed builders).
- Whether to expose an **MCP server** so agents discover Payper-listed services natively.
