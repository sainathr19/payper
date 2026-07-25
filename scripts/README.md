# scripts

Spike and operational scripts.

- **`spike-pay-endpoint.ts`** — the W1–2 milestone, **runnable today**. Funds two XRPL
  testnet wallets, builds a quote, has the agent presign a Payment, then verifies + settles
  it through the direct-XRPL facilitator — printing a real, validated on-ledger txid.

  ```bash
  pnpm --filter @payper/scripts spike
  ```

  Exercises the real `@payper/sdk` primitives (`signXrplPayment`, `DirectXrplFacilitator`).
  Swapping in `T54Facilitator` runs the same loop through t54's facilitator once its API is
  confirmed.
