import express, { type Response } from "express";
import { Registry, type Service } from "./registry.js";
import { AnalyticsStore } from "./analytics.js";
import { Indexer, type LedgerEvent } from "./indexer.js";
import { payService } from "./payer.js";

const app = express();
app.use(express.json());

// CORS: the dashboard (web, another origin) reads these endpoints from the browser.
app.use((req, res, next) => {
  res.set("Access-Control-Allow-Origin", process.env.CORS_ORIGIN ?? "*");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

const registry = new Registry();
const analytics = new AnalyticsStore();

// The gateway that hosts the paid endpoints these services advertise.
const GATEWAY_URL = process.env.GATEWAY_URL ?? "http://localhost:8788";
const MERCHANT =
  process.env.PAYPER_ACCOUNT_ADDRESS ??
  (process.env.WATCH_ACCOUNTS ?? "").split(",")[0]?.trim() ??
  "";

// Seed the registry with the demo services the gateway actually serves (prices
// in XRP drops). Real, payable listings — not placeholders.
const SEED_SERVICES: Service[] = [
  {
    id: "inference",
    name: "Inference — GPT-class completion",
    owner: MERCHANT,
    endpoints: [
      {
        path: "/inference",
        price: "10000",
        asset: "XRP",
        description: "One chat/completion call. Pay-per-request, no key, no subscription.",
      },
    ],
  },
  {
    id: "embeddings",
    name: "Embeddings",
    owner: MERCHANT,
    endpoints: [
      {
        path: "/embeddings",
        price: "2000",
        asset: "XRP",
        description: "Vector embeddings for a batch of inputs.",
      },
    ],
  },
  {
    id: "search",
    name: "Web search",
    owner: MERCHANT,
    endpoints: [
      {
        path: "/search",
        price: "5000",
        asset: "XRP",
        description: "Ranked search results with source URLs for agent retrieval.",
      },
    ],
  },
  {
    id: "image",
    name: "Image generation",
    owner: MERCHANT,
    endpoints: [
      {
        path: "/image",
        price: "20000",
        asset: "XRP",
        description: "One 1024×1024 image. Billed per generated asset.",
      },
    ],
  },
];
for (const service of SEED_SERVICES) registry.register(service);

/** Paths the /pay proxy is allowed to hit — locked to seeded services (no SSRF). */
const PAYABLE_PATHS = new Set(
  SEED_SERVICES.flatMap((s) => s.endpoints.map((e) => e.path)),
);

// --- Marketplace: machine-readable service listings agents can consume. ---
app.get("/services", (_req, res) => res.json(registry.list()));
app.post("/services", (req, res) => {
  registry.register(req.body);
  res.status(201).json({ ok: true });
});

// --- Pay & call: run one real settlement against a seeded service (demo). ---
app.post("/pay", async (req, res) => {
  const path = (req.body?.path ?? "") as string;
  if (!PAYABLE_PATHS.has(path)) {
    res.status(400).json({ error: "unknown service path" });
    return;
  }
  try {
    const result = await payService(GATEWAY_URL + path);
    res.json({
      status: result.status,
      txid: result.txid ?? null,
      explorer: result.explorer ?? null,
      body: result.body ?? null,
    });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "payment failed" });
  }
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
