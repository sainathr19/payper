# Tide — Protocol & Product Specification

> Liquid yield-bearing XRP on XRPL's native lending stack (XLS-65 + XLS-66),
> with instant exit via an XLS-30 AMM pool.

Status: **Draft / hackathon** · Network: **XRPL Devnet** · SDK: **xrpl.js**

---

## 1. Overview

Tide lets a user deposit **XRP** and receive **`lyXRP`** — a transferable,
yield-bearing token that represents a share of a pooled lending vault. Yield comes
from fixed-term, cover-protected loans originated on top of the vault. Because the
vault's native withdrawal queue is first-come-first-serve, Tide also seeds an
`lyXRP/XRP` AMM pool so holders can exit **instantly** at a market price.

`lyXRP` **is** the XLS-65 vault share (an MPT issued by the vault's pseudo-account).
There is no wrapper contract — the liquid, appreciating token is a native ledger object.

### Closes three registry gaps
| Gap | Description | Tide component |
|-----|-------------|----------------|
| OPP-043 | Liquid Staked XRP (stETH-style token) | `lyXRP` + mint/redeem UX |
| OPP-033 | Native Yield Aggregator | Curator/router across vaults |
| OPP-034 | Lending front-end on XLS-65 | Lender + borrower + yield dashboard |

---

## 2. On-chain objects (native XRPL)

### 2.1 Vault (XLS-65 Single Asset Vault)
Holds the pooled XRP and issues `lyXRP`. Key fields:

| Field | Meaning for Tide |
|-------|------------------|
| `Owner` | Tide curator account (also the Loan Broker owner) |
| `Account` | Vault **pseudo-account** that custodies pooled XRP |
| `Asset` | `XRP` |
| `AssetsTotal` | Total vault value (principal out on loans + idle + accrued interest) |
| `AssetsAvailable` | Idle XRP available to lend or redeem |
| `ShareMPTID` | Issuance ID of the `lyXRP` share token |
| `LossUnrealized` | Paper loss from impaired loans (lowers redemption value) |
| `AssetsMaximum` | Optional deposit cap (`0` = uncapped) |
| `Scale` | Share precision (power-of-10 multiplier) |
| `WithdrawalPolicy` | `vaultStrategyFirstComeFirstServe` |
| `Flags` | `lsfVaultPrivate` if gated by a Permissioned Domain |

**Share value (exchange rate).** Per the spec:
- Deposit (round down): `Δshares = Δassets × sharesTotal / assetsTotal`
- Redeem (accounts for loss): `Δassets = Δshares × (assetsTotal − LossUnrealized) / sharesTotal`

So as loans pay interest, `AssetsTotal` rises and each `lyXRP` redeems for more XRP.
This is the entire yield mechanism — no rebasing, value accrues to the exchange rate
(like stETH-wstETH wrapped form).

### 2.2 Loan Broker (XLS-66)
Originates loans from the vault and posts first-loss capital. Must be the vault Owner.

| Field | Meaning for Tide |
|-------|------------------|
| `Owner` / `Account` | Curator account / Loan Broker pseudo-account (holds cover) |
| `VaultID` | The Tide vault |
| `DebtTotal` | Principal + interest the protocol owes the vault |
| `DebtMaximum` | Debt ceiling (`0` = none) |
| `CoverAvailable` | First-loss capital currently posted |
| `CoverRateMinimum` | Min cover as % of `DebtTotal` (1/10th bps) |
| `CoverRateLiquidation` | % of min cover liquidated on default |
| `ManagementFeeRate` | Curator's cut of interest (0–10000) |

### 2.3 Loan (XLS-66)
One per borrower position. Notable fields: `Borrower`, `PrincipalOutstanding`,
`TotalValueOutstanding`, `InterestRate`, `LateInterestRate`, `CloseInterestRate`,
`StartDate`, `NextPaymentDueDate`, `PaymentInterval`, `GracePeriod`,
`PaymentRemaining`, `PeriodicPayment`, `Flags` (`lsfLoanDefault`, `lsfLoanImpaired`).

### 2.4 AMM pool (XLS-30)
An `lyXRP / XRP` pool seeded by Tide so holders can swap out instantly instead of
queuing for vault redemption. Also gives live price discovery on the yield token.

---

## 3. Transactions used

**Vault (XLS-65)**
- `VaultCreate` — fields: `Asset=XRP`, `Flags` (`tfVaultPrivate`, `tfVaultShareNonTransferable`), `Scale`, `AssetsMaximum`, `WithdrawalPolicy`, `DomainID`
- `VaultSet` — `VaultID`, `Data`, `AssetsMaximum`, `DomainID`
- `VaultDeposit` — `VaultID`, `Amount` → mints `lyXRP`
- `VaultWithdraw` — `VaultID`, `Amount` (assets or shares), `Destination` → burns `lyXRP`
- `VaultClawback`, `VaultDelete`

**Loan Broker / Loans (XLS-66)**
- `LoanBrokerSet` — create/update broker: `VaultID`, `ManagementFeeRate`, `DebtMaximum`, `CoverRateMinimum`, `CoverRateLiquidation`
- `LoanBrokerCoverDeposit` / `LoanBrokerCoverWithdraw` — manage first-loss capital
- `LoanSet` — originate loan (**bilaterally signed**): `LoanBrokerID`, `Counterparty`, `CounterpartySignature`, `PrincipalRequested`, `InterestRate`, `PaymentTotal`, `PaymentInterval`, `GracePeriod`, fee fields
- `LoanPay` — borrower repayment: `LoanID`, `Amount`, flags (`tfLoanFullPayment`, `tfLoanLatePayment`)
- `LoanManage` — `tfLoanImpair` / `tfLoanUnimpair` / `tfLoanDefault`
- `LoanDelete`, `LoanBrokerDelete`

**AMM (XLS-30)**
- `AMMCreate` (seed `lyXRP/XRP`), `AMMDeposit`, `Payment` (swap for instant exit)

---

## 4. Core flows

### 4.1 Lender — deposit (mint lyXRP)
1. User connects wallet, enters XRP amount.
2. App submits `VaultDeposit { VaultID, Amount }`.
3. Vault mints `lyXRP` to the user at the current exchange rate.
4. Dashboard shows position = `lyXRP balance × redemption rate`.

### 4.2 Yield generation (curator)
1. Curator backend monitors `AssetsAvailable` and demand.
2. Originates `LoanSet` (broker + borrower both sign).
3. Borrower draws `PrincipalRequested − LoanOriginationFee`.
4. On `LoanPay`, interest (net of `ManagementFeeRate`) flows into `AssetsTotal` →
   `lyXRP` redemption rate rises.

### 4.3 Lender — exit
- **Standard:** `VaultWithdraw` (burns `lyXRP`) — subject to `AssetsAvailable` and the
  first-come-first-serve queue when funds are lent out.
- **Instant (Tide differentiator):** swap `lyXRP → XRP` through the AMM pool, any time,
  at market price (a small spread vs. NAV is the cost of immediacy).

### 4.4 Borrower
1. Requests a loan (amount, term).
2. Curator reviews → constructs `LoanSet`; both parties sign.
3. Borrower repays on schedule via `LoanPay`; late/default handled by `LoanManage`.

---

## 5. Yield & risk model

- **APY (displayed):** annualized from realized loan interest net of `ManagementFeeRate`,
  computed off-chain from loan terms + repayment history.
- **First-loss cover:** defaults liquidate `CoverAvailable` before touching depositors;
  if `CoverAvailable < DebtTotal × CoverRateMinimum`, new loans pause and fees rebuild cover.
- **Impairment:** `tfLoanImpair` raises `LossUnrealized`, immediately lowering the
  redemption rate so exiting late doesn't dump loss on remaining holders.
- **Cover-ratio health bar** is a first-class UI element (analogous to Aave's health factor).

---

## 6. MVP scope

**In:** single curated XRP vault · `lyXRP` mint/redeem · one demo loan to repayment
(visible APY climb) · loan-book + cover-health dashboard · `lyXRP/XRP` AMM instant exit.

**Stretch:** multi-vault aggregator/router (OPP-033) · private vault via Credentials/Permissioned Domain · borrower onboarding.

**Out (be explicit):** on-chain automated underwriting, decentralized curation. MVP
curator is a trusted role (as with Yearn/Morpho curators).

---

## 7. Open questions / to verify on devnet

- Exact `xrpl.js` support + type defs for the XLS-65/66 transactions (may need raw JSON tx).
- MPT support in target wallets (Xaman / Crossmark) for holding/transferring `lyXRP`.
- The bilateral `LoanSet` signing flow (collecting `CounterpartySignature`) UX.
- Whether XLS-65/66 are enabled on the chosen devnet endpoint at build time.
