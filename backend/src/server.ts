import express, { type Response } from "express";
import { Registry } from "./registry.js";
import { AnalyticsStore } from "./analytics.js";
import { Indexer, type LedgerEvent } from "./indexer.js";

const app = express();
app.use(express.json());

const registry = new Registry();
const analytics = new AnalyticsStore();

// --- Marketplace: machine-readable service listings agents can consume. ---
app.get("/services", (_req, res) => res.json(registry.list()));
app.post("/services", (req, res) => {
  registry.register(req.body);
  res.status(201).json({ ok: true });
});

// --- Dashboard: rolled-up analytics + recent settled-payment feed. ---
app.get("/analytics", (_req, res) => res.json(analytics.summary()));
app.get("/events", (_req, res) => res.json(analytics.recent()));

// --- Live feed: Server-Sent Events, one message per settled payment. ---
const sseClients = new Set<Response>();
app.get("/stream", (_req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders();
  sseClients.add(res);
  _req.on("close", () => sseClients.delete(res));
});

function broadcast(event: LedgerEvent): void {
  const line = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of sseClients) client.write(line);
}

// --- Indexer: watch merchant accounts, feed analytics + the live feed. ---
const endpoint = process.env.XRPL_ENDPOINT ?? "wss://s.altnet.rippletest.net:51233";
const accounts = (process.env.WATCH_ACCOUNTS ?? "")
  .split(",")
  .map((a) => a.trim())
  .filter(Boolean);

async function startIndexer(): Promise<void> {
  if (accounts.length === 0) {
    console.log("[backend] no WATCH_ACCOUNTS set; indexer idle");
    return;
  }
  const indexer = new Indexer(endpoint, accounts);
  indexer.onEvent((e) => {
    if (analytics.record(e)) broadcast(e);
  });
  await indexer.start();
  await indexer.backfill();
  console.log(`[backend] indexing ${accounts.length} account(s) on ${endpoint}`);
}

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => {
  console.log(`[backend] listening on :${port}`);
  void startIndexer();
});
