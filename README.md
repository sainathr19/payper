# 🌊 Tide — Liquid Yield for XRP

> Deposit XRP, receive **lyXRP** — a liquid, yield-bearing token built on XRPL's
> native lending stack (XLS-65 + XLS-66), with instant exit via an on-chain AMM.

Built for the **[Make Waves on XRPL](https://hackathons.xrpl-commons.org/hackathons/make-waves-041f8ce6)** hackathon (Jun–Sep 2026).

---

## The problem

Over **$110B of XRP sits idle**, earning nothing. Meanwhile XRPL just shipped a
native lending stack — the **XLS-65 Single Asset Vault** and **XLS-66 Lending
Protocol** — but there's **no consumer-facing app** on top of it. The primitives
exist; the product doesn't.

## What Tide does

Tide turns idle XRP into a productive, liquid asset:

1. **Deposit XRP** into a Tide vault (XLS-65).
2. **Receive `lyXRP`** — the vault's native share token (an MPT). It's transferable
   and its value grows as the pool earns interest.
3. **Yield is generated** by XLS-66: pooled funds are lent out as fixed-term,
   first-loss-cover-protected loans. Interest flows back into the vault, lifting the
   `lyXRP` exchange rate.
4. **Exit instantly** — a seeded `lyXRP/XRP` AMM pool lets holders swap out at any
   time, instead of waiting in the vault's first-come-first-serve withdrawal queue.

`lyXRP` is to XRP lending what stETH is to ETH staking — except it's a native ledger
object, no smart contract required. (We call it *liquid yield*, not staking — XRPL
isn't proof-of-stake.)

## Why it matters

One product closes three gaps from the XRPL builder-opportunities registry:

| Gap | What it is | Tide's piece |
|-----|-----------|--------------|
| **OPP-043** | Liquid Staked XRP (a stETH-style liquid token) | The `lyXRP` token + mint/redeem UX |
| **OPP-033** | Native Yield Aggregator | Curator/router across vaults for best yield |
| **OPP-034** | Lending front-end on XLS-65 | First end-user lend/borrow + yield dashboard |

## How it works

**On-chain (native XRPL primitives):**
- **Vault** (XLS-65) — custodies pooled XRP, issues the `lyXRP` share MPT.
- **Loan Broker** (XLS-66) — originates loans, posts first-loss cover.
- **AMM pool** (XLS-30) — `lyXRP/XRP` for instant secondary-market exit + price discovery.

**App layer (this repo):**
- **Frontend** — deposit/redeem, live APY + position dashboard, borrower flow, one-click exit.
- **Curator backend** — runs loan-broker ops, manages the cover ratio, indexes vault/loan
  state directly from `rippled`/Clio, computes APY.

## Tech stack

- **Ledger:** XRPL (native — *not* the EVM sidechain), XLS-65 / XLS-66 / XLS-30 (AMM)
- **SDK:** [`xrpl.js`](https://github.com/XRPLF/xrpl.js)
- **Network:** XRPL Devnet (XLS-65/66 enabled)
- **Frontend:** Next.js + TypeScript
- **Wallet:** Xaman / Crossmark (MPT-capable)

## Roadmap

- [ ] **W1–2** — Devnet spike: vault create/deposit/withdraw + loan broker + loan-to-repayment end to end
- [ ] **W3–5** — `lyXRP` mint/redeem + yield & position dashboard
- [ ] **W6–7** — Borrower flow (bilateral `LoanSet` signing) + curator backend + cover management
- [ ] **W8–9** — `lyXRP/XRP` AMM pool + instant-exit UX
- [ ] **W10–11** — Multi-vault aggregator/router + polish
- [ ] **W12** — Demo, pitch, docs, submission

## Status & disclaimer

🚧 Hackathon project, in active development on **XRPL Devnet**. Not audited, not for
production use. In the MVP the vault curator is a trusted role (as with Yearn/Morpho
curators) — progressive decentralization is on the roadmap.

## License

MIT
