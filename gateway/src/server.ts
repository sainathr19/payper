import express from "express";
import { T54Facilitator, type Asset } from "@payper/sdk";
import { payper } from "./middleware.js";

// Demo host: a single paid endpoint wrapped with Payper.
// Run with `pnpm --filter @payper/gateway dev` once env + facilitator are wired.
const app = express();

const rlusd: Asset = {
  kind: "ISSUED",
  currency: process.env.RLUSD_CURRENCY ?? "",
  issuer: process.env.RLUSD_ISSUER ?? "",
};

const facilitator = new T54Facilitator(
  process.env.T54_FACILITATOR_URL ?? "",
  process.env.T54_API_KEY,
);

app.get(
  "/inference",
  payper({
    price: "0.01",
    asset: rlusd,
    payTo: process.env.PAYPER_ACCOUNT_ADDRESS ?? "",
    facilitator,
  }),
  (_req, res) => {
    res.json({ result: "paid response — your model output here" });
  },
);

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => console.log(`[gateway] listening on :${port}`));
