import express from "express";
import { NETWORK, T54_FACILITATOR, T54Facilitator } from "@payper/sdk";
import { payper } from "./middleware.js";

// Demo host: a handful of paid endpoints, each wrapped with Payper. Prices are in
// XRP drops so a faucet-funded agent can settle them. Run with
// `pnpm --filter @payper/gateway dev` once env + facilitator are wired.
const app = express();

const isMainnet = process.env.XRPL_NETWORK === "mainnet";
const facilitator = new T54Facilitator(
  process.env.T54_FACILITATOR_URL ??
    (isMainnet ? T54_FACILITATOR.mainnet : T54_FACILITATOR.testnet),
  process.env.T54_API_KEY,
);

const payTo = process.env.PAYPER_ACCOUNT_ADDRESS ?? "";
const network = isMainnet ? NETWORK.mainnet : NETWORK.testnet;

/** One paid endpoint: path, price in drops, and the demo payload it returns. */
interface PaidRoute {
  path: string;
  price: string;
  body: unknown;
}

const ROUTES: PaidRoute[] = [
  {
    path: "/inference",
    price: "10000", // 0.01 XRP
    body: { result: "paid response — your model output here" },
  },
  {
    path: "/embeddings",
    price: "2000", // 0.002 XRP
    body: { dims: 8, vector: [0.021, -0.114, 0.318, 0.07, -0.256, 0.19, -0.043, 0.221] },
  },
  {
    path: "/search",
    price: "5000", // 0.005 XRP
    body: {
      results: [
        { title: "XRPL x402 scheme", url: "https://xrpl-x402.t54.ai/docs" },
        { title: "RLUSD overview", url: "https://ripple.com/rlusd" },
      ],
    },
  },
  {
    path: "/image",
    price: "20000", // 0.02 XRP
    body: { url: "https://picsum.photos/seed/payper/1024", size: "1024x1024" },
  },
];

for (const route of ROUTES) {
  app.get(
    route.path,
    payper({ price: route.price, asset: "XRP", payTo, network, facilitator }),
    (_req, res) => res.json(route.body),
  );
}

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => console.log(`[gateway] listening on :${port}`));
