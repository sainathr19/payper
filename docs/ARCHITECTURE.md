# Tide — System Architecture

Tide is a **native XRPL** application (not the EVM sidechain). There are no Solidity
contracts — "logic" lives in a frontend + a backend service that orchestrate native
XRPL transactions. The on-chain primitives (vault, loan broker, AMM) do the custody
and accounting.

---

## Layers

```
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND  (Next.js + TypeScript + xrpl.js)                  │
│  • Deposit / redeem  • Position + APY dashboard              │
│  • Borrower flow     • Instant-exit swap (AMM)               │
│  • Wallet connect (Xaman / Crossmark)                        │
└───────────────┬──────────────────────────┬──────────────────┘
                │ read (indexed state)      │ sign & submit tx
                ▼                           ▼
┌──────────────────────────────┐   ┌──────────────────────────┐
│  CURATOR BACKEND (Node)      │   │  USER WALLET             │
│  • Loan broker ops           │   │  • Holds XRP + lyXRP     │
│  • Cover-ratio management     │   │  • Signs VaultDeposit,   │
│  • Indexes vault/loan state   │   │    VaultWithdraw,        │
│    from rippled / Clio        │   │    LoanPay, AMM swaps    │
│  • APY computation            │   └────────────┬─────────────┘
│  • Signs broker-side LoanSet  │                │
└───────────────┬──────────────┘                │
                │ submit tx                       │
                ▼                                 ▼
┌─────────────────────────────────────────────────────────────┐
│  XRPL DEVNET  (native ledger objects)                        │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────────┐   │
│  │ Vault       │──▶│ Loan Broker  │──▶│ Loan(s)          │   │
│  │ (XLS-65)    │   │ (XLS-66)     │   │                  │   │
│  │ issues lyXRP│   │ +first-loss  │   └──────────────────┘   │
│  └─────┬───────┘   └──────────────┘                          │
│        │ lyXRP                                               │
│        ▼                                                      │
│  ┌─────────────────────┐                                     │
│  │ AMM pool (XLS-30)   │  lyXRP / XRP  → instant exit        │
│  └─────────────────────┘                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Components

### Frontend (`/app` or `/web`)
- **Wallet hook** — connect, account info, sign & submit (Xaman/Crossmark; MPT-aware).
- **Vault client** — wraps `xrpl.js` for `VaultDeposit` / `VaultWithdraw`, reads vault state.
- **Dashboard** — position value, live APY, redemption rate, cover-health bar, loan book.
- **Exit module** — compares standard `VaultWithdraw` vs AMM swap; one-click instant exit.
- **Borrower module** — request loan, co-sign `LoanSet`, repay via `LoanPay`.

### Curator backend (`/backend` or `/curator`)
- **Broker service** — `LoanBrokerSet`, cover deposits/withdraws, broker-side `LoanSet` signing.
- **Indexer** — subscribes to `rippled` / queries Clio for `Vault`, `LoanBroker`, `Loan` objects.
- **APY engine** — annualizes net interest from loan terms + repayments.
- **Risk monitor** — watches `CoverAvailable` vs `DebtTotal × CoverRateMinimum`; flags impairments.

### Shared (`/packages/sdk` or `/lib`)
- Thin TypeScript helpers for building XLS-65/66 transactions (likely raw JSON until
  `xrpl.js` ships typed builders), exchange-rate math, and amount/scale conversion.

---

## Suggested repo layout
```
tide/
├── README.md
├── docs/
│   ├── SPEC.md
│   ├── ARCHITECTURE.md
│   ├── ui-inspiration.md
│   └── inspiration/        # drop UI reference captures here
├── web/                    # Next.js frontend
├── curator/                # Node backend (broker + indexer + APY)
├── lib/                    # shared xrpl tx builders + math
└── scripts/                # devnet spike scripts (W1–2)
```

---

## Data flow (deposit → yield → exit)
1. **Deposit:** wallet signs `VaultDeposit` → vault mints `lyXRP` → indexer picks up new state → dashboard updates position.
2. **Yield:** curator originates `LoanSet`; borrower repays `LoanPay`; interest raises `AssetsTotal`; APY engine recomputes; redemption rate ticks up.
3. **Exit:** user chooses `VaultWithdraw` (queue) or AMM swap (instant); frontend builds and submits the tx; indexer reflects the burn/swap.

---

## Trust model (be explicit)
MVP curator is **trusted** — it underwrites loans and manages cover off-chain, like a
Yearn/Morpho curator. First-loss capital protects depositors economically. Progressive
decentralization (multi-curator, on-chain policy) is roadmap, not MVP.
