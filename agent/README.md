# @payper/agent

An autonomous consumer built on the XRPL AI Starter Kit (Agent Wallet + Payment skills).
It discovers marketplace listings and pays for them on a loop — the demo's source of
continuous, real on-chain volume.

Each call runs the x402 Payment skill: `GET` the resource → receive a `402` +
`PAYMENT-REQUIRED` quote → sign an XRPL Payment (creating a trust line first for
IOU quotes like RLUSD) → retry with `PAYMENT-SIGNATURE` → `200` +
`PAYMENT-RESPONSE` (a validated txid). `runLoop` repeats this to produce ongoing
settled volume.

Run against the gateway demo:

```bash
pnpm --filter @payper/agent start http://localhost:8787/inference --count 10 --interval 2
```

- first positional — target URL (default `http://localhost:8787/inference`)
- `--count N` — number of paid calls; `0` loops until `Ctrl-C` (default `5`)
- `--interval S` — seconds between calls (default `3`)

Library entry points, used by the `test:agent` harness:

- `@payper/agent` → `runLoop(url, client, wallet, opts)` — the loop
- `@payper/agent/pay` → `payFor(url, client, wallet)` — a single settled call

Live proof it settles repeated payments through the t54 testnet facilitator:

```bash
pnpm --filter @payper/scripts test:agent
```
