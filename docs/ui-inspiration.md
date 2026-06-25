# Tide — UI Inspiration & Design Direction

A curated reference set for Tide's interface. For each product: the **link**, what
screen to study, and **what to borrow**. Capture your own screenshots into
`docs/inspiration/` (see the folder's README) and reference them next to each entry.

> Note: we don't commit other products' screenshots (copyright). Links + notes here;
> your own captures live in `docs/inspiration/` for private design reference.

---

## 1. Liquid-staking / liquid-token UX
| Product | Link | Study | Borrow for Tide |
|---------|------|-------|-----------------|
| **Lido** | https://stake.lido.fi | Stake card, stETH balance, APR badge | The single clean deposit card + "you'll receive `lyXRP`" preview + live APR |
| **Origin OETH** | https://www.originprotocol.com/oeth | Yield token dashboard | Value-accruing token framing, simple yield explainer |
| **Sky / Spark sUSDS** | https://spark.fi | Savings deposit | "Savings rate" simplicity for a non-degen audience |

## 2. Vaults & yield aggregation
| Product | Link | Study | Borrow for Tide |
|---------|------|-------|-----------------|
| **Yearn** | https://yearn.fi/vaults | Vault list + vault detail | APY column, TVL, vault detail page layout (for OPP-033 multi-vault) |
| **Morpho** | https://app.morpho.org | Curated vaults, risk disclosures | Curator framing, clean institutional look, cover/risk transparency |
| **Pendle** | https://app.pendle.finance | PT/YT, pro charts | Yield charts, "fixed vs variable" presentation, advanced-mode toggle |
| **Superform** | https://www.superform.xyz | Cross-vault router | Aggregator/router UX patterns |

## 3. Lending dashboards (lender + borrower)
| Product | Link | Study | Borrow for Tide |
|---------|------|-------|-----------------|
| **Aave** | https://app.aave.com | Supply/borrow dashboard, **health factor** | The cover-ratio **health bar**, supply/borrow split layout |
| **Spark** | https://spark.fi | Lending market view | Market stats cards, utilization display |
| **Maple / SOIL** | https://maple.finance | Institutional credit, loan book | Loan-book table, borrower profiles, term display (closest to XLS-66) |

## 4. Swap / instant-exit
| Product | Link | Study | Borrow for Tide |
|---------|------|-------|-----------------|
| **Jupiter** | https://jup.ag | Swap UX, route preview | The instant-exit swap modal (`lyXRP → XRP`), price-impact display |
| **Uniswap** | https://app.uniswap.org | Swap component, slippage settings | Token selector, min-received, slippage |

## 5. Analytics / charts
| Product | Link | Study | Borrow for Tide |
|---------|------|-------|-----------------|
| **DefiLlama** | https://defillama.com | Yield + TVL charts | APY history sparkline, TVL chart |
| **Dune** | https://dune.com | Dashboard composition | Metric cards, time-series styling |

---

## Design direction

**Theme:** "Tide / ocean" — calm, liquid, trustworthy (not degen-neon).
- **Palette:** deep ocean navy/teal base, soft foam highlights, one bright accent
  (e.g. aqua/cyan) for primary actions. Dark mode default; clean light mode.
- **Motion:** subtle wave/ripple on deposit confirm; number roll-up when the
  redemption rate / position ticks. Keep it tasteful (Framer Motion).
- **Typography:** a precise grotesque for numbers (e.g. Inter / Geist) so balances
  and APYs read crisply; larger display weight for the hero APY.

**Key screens to design (in priority order):**
1. **Deposit card** — amount in (XRP) → preview lyXRP out + current APY. (Lido-style)
2. **Position dashboard** — your lyXRP, value in XRP, earned yield, redemption rate, APY chart.
3. **Vault detail** — TVL, utilization, **cover-ratio health bar**, loan book table. (Aave + Maple)
4. **Instant-exit modal** — swap lyXRP→XRP via AMM, price impact, "vs. standard withdraw" compare. (Jupiter)
5. **Borrower flow** — request loan, co-sign, repayment schedule. (Maple)
6. (Stretch) **Aggregator view** — compare vaults by APY/risk, route deposit. (Yearn/Superform)

**Component kit suggestion:** Next.js + Tailwind + **shadcn/ui**, **Recharts** (or visx)
for charts, **Framer Motion** for motion. This gets a polished, non-templated look fast
— and the `frontend-design` skill can help push the visual identity beyond defaults.

---

## How to add your own captures
1. Capture the screens above (your browser / a tool like Shottr or CleanShot).
2. Save as `docs/inspiration/<product>-<screen>.png` (e.g. `lido-stake-card.png`).
3. Reference inline here, e.g. `![Lido stake card](inspiration/lido-stake-card.png)`.
These are for private design reference; keep them out of any public marketing.
