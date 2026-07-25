import express from "express";
import { Registry } from "./registry.js";
import { Analytics } from "./analytics.js";

const app = express();
app.use(express.json());

const registry = new Registry();
const analytics = new Analytics();

// Marketplace: machine-readable service listings agents can consume.
app.get("/services", (_req, res) => res.json(registry.list()));
app.post("/services", (req, res) => {
  registry.register(req.body);
  res.status(201).json({ ok: true });
});

// Dashboard feed: live revenue + on-chain activity.
app.get("/analytics", (_req, res) =>
  res.json({
    txCount: analytics.txCount(),
    payingAgents: analytics.payingAgents(),
    revenueByEndpoint: analytics.revenueByEndpoint(),
  }),
);

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => console.log(`[backend] listening on :${port}`));
