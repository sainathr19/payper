import express from "express";
import { NETWORK, T54Facilitator } from "@payper/sdk";
import { payper } from "./middleware.js";

// Demo host: a single paid endpoint wrapped with Payper.
// Run with `pnpm --filter @payper/gateway dev` once env + facilitator are wired.
const app = express();

const facilitator = new T54Facilitator(
  process.env.T54_FACILITATOR_URL ?? "https://xrpl-x402.t54.ai",
  process.env.T54_API_KEY,
);

app.get(
  "/inference",
  payper({
    price: "10000", // 0.01 XRP in drops
    asset: "XRP",
    payTo: process.env.PAYPER_ACCOUNT_ADDRESS ?? "",
    network: process.env.XRPL_NETWORK === "mainnet" ? NETWORK.mainnet : NETWORK.testnet,
    facilitator,
  }),
  (_req, res) => {
    res.json({ result: "paid response — your model output here" });
  },
);

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => console.log(`[gateway] listening on :${port}`));
