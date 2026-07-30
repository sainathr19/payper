// Client for the Payper backend (registry + indexer + analytics + live feed).

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

export const EXPLORER =
  process.env.NEXT_PUBLIC_XRPL_NETWORK === "mainnet"
    ? "https://livenet.xrpl.org"
    : "https://testnet.xrpl.org";

/** Mirrors `@payper/backend` LedgerEvent (kept local so web has no server dep). */
export interface LedgerEvent {
  txid: string;
  from: string;
  to: string;
  amount: string;
  asset: string;
  issuer?: string;
  ledgerIndex: number;
  timestamp: number;
  invoiceIdHash?: string;
}

export interface Analytics {
  txCount: number;
  payingAgents: number;
  revenueByAsset: Record<string, string>;
}

export type StreamStatus = "connecting" | "live" | "reconnecting";

export async function getAnalytics(): Promise<Analytics> {
  const res = await fetch(`${API_BASE}/analytics`, { cache: "no-store" });
  if (!res.ok) throw new Error(`analytics ${res.status}`);
  return res.json();
}

export async function getEvents(): Promise<LedgerEvent[]> {
  const res = await fetch(`${API_BASE}/events`, { cache: "no-store" });
  if (!res.ok) throw new Error(`events ${res.status}`);
  return res.json();
}

/* ---------- Marketplace: registry listings + pay-per-call ---------- */

export interface ServiceEndpoint {
  path: string;
  /** Price in base units: drops for XRP, or the IOU value. */
  price: string;
  asset: string;
  description?: string;
}

export interface Service {
  id: string;
  name: string;
  owner: string;
  endpoints: ServiceEndpoint[];
}

export interface PayOutcome {
  status: number;
  txid: string | null;
  explorer: string | null;
  body: unknown;
}

export async function getServices(): Promise<Service[]> {
  const res = await fetch(`${API_BASE}/services`, { cache: "no-store" });
  if (!res.ok) throw new Error(`services ${res.status}`);
  return res.json();
}

/** One accepted payment option in a 402 quote (mirrors the SDK PaymentRequirements). */
export interface Requirements {
  scheme: string;
  network: string;
  amount: string;
  asset: string;
  payTo: string;
  maxTimeoutSeconds?: number;
  resource?: string;
  description?: string;
  extra?: Record<string, unknown>;
}

export interface InspectResult {
  status: number;
  quote: { x402Version: number; accepts: Requirements[] } | null;
}

/** GET a seeded endpoint unpaid via the backend and return its decoded 402 quote. */
export async function inspectService(path: string): Promise<InspectResult> {
  const res = await fetch(`${API_BASE}/inspect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error ?? `inspect ${res.status}`);
  return data as InspectResult;
}

/** Ask the backend to run one real settled call against a seeded service path. */
export async function payService(path: string): Promise<PayOutcome> {
  const res = await fetch(`${API_BASE}/pay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error ?? `pay ${res.status}`);
  return data as PayOutcome;
}

/** Display an XRP price given in drops (base units); IOU prices pass through. */
export function priceDisplay(price: string, asset: string): string {
  if (asset === "XRP") return trimAmount(Number(price) / 1_000_000);
  return trimAmount(price);
}

/** Open the SSE feed; returns the EventSource so the caller can close it. */
export function streamEvents(
  onEvent: (e: LedgerEvent) => void,
  onStatus: (s: StreamStatus) => void,
): EventSource {
  const es = new EventSource(`${API_BASE}/stream`);
  es.onopen = () => onStatus("live");
  es.onerror = () => onStatus("reconnecting");
  es.onmessage = (msg) => {
    try {
      onEvent(JSON.parse(msg.data) as LedgerEvent);
    } catch {
      /* ignore malformed frames */
    }
  };
  return es;
}

/** RLUSD's 40-hex code → a friendly label; otherwise show the code as-is. */
export function assetLabel(asset: string): string {
  if (asset === "XRP") return "XRP";
  if (asset.toUpperCase().startsWith("524C555344")) return "RLUSD";
  return asset.length > 10 ? `${asset.slice(0, 6)}…` : asset;
}

export function shortId(id: string, n = 6): string {
  return id.length > n * 2 ? `${id.slice(0, n)}…${id.slice(-n)}` : id;
}

export function relativeTime(unixSeconds: number): string {
  if (!unixSeconds) return "—";
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - unixSeconds);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function fullTime(unixSeconds: number): string {
  if (!unixSeconds) return "—";
  return new Date(unixSeconds * 1000).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function trimAmount(v: string | number): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

/* ---------- Analytics derived client-side from the event list ---------- */

export type Range = "day" | "week" | "month" | "all";

const RANGE_SECONDS: Record<Exclude<Range, "all">, number> = {
  day: 86400,
  week: 7 * 86400,
  month: 30 * 86400,
};

/** Events within `range` (by settlement timestamp). Events with no timestamp are kept. */
export function filterByRange(events: LedgerEvent[], range: Range): LedgerEvent[] {
  if (range === "all") return events;
  const cutoff = Math.floor(Date.now() / 1000) - RANGE_SECONDS[range];
  return events.filter((e) => !e.timestamp || e.timestamp >= cutoff);
}

export interface Insights {
  count: number;
  agents: number;
  revenueByAsset: Record<string, number>;
  avgByAsset: Record<string, number>;
  txPerAgent: number;
  successRate: number; // indexer only surfaces settled payments → 100%
}

export function computeInsights(events: LedgerEvent[]): Insights {
  const revenueByAsset: Record<string, number> = {};
  const counts: Record<string, number> = {};
  const agents = new Set<string>();
  for (const e of events) {
    revenueByAsset[e.asset] = (revenueByAsset[e.asset] ?? 0) + Number(e.amount);
    counts[e.asset] = (counts[e.asset] ?? 0) + 1;
    agents.add(e.from);
  }
  const avgByAsset: Record<string, number> = {};
  for (const a of Object.keys(revenueByAsset)) avgByAsset[a] = revenueByAsset[a] / counts[a];
  return {
    count: events.length,
    agents: agents.size,
    revenueByAsset,
    avgByAsset,
    txPerAgent: agents.size ? events.length / agents.size : 0,
    successRate: events.length ? 100 : 0,
  };
}

/** Chart colors, assigned per asset in first-seen order. */
export const CHART_COLORS = ["#8ea0f0", "#a3a7ad", "#86efac", "#f0b48e"];

export interface DailySeries {
  labels: string[];
  series: { name: string; color: string; points: number[] }[];
}

/** Bucket settled volume per day, one stacked series per asset. */
export function dailySeries(events: LedgerEvent[]): DailySeries {
  const dayFmt = (t: number) =>
    new Date(t * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  const dated = events.filter((e) => e.timestamp);
  if (dated.length === 0) return { labels: [], series: [] };

  const dayKeys: string[] = [];
  const seen = new Set<string>();
  const assets: string[] = [];
  const byDayAsset = new Map<string, Map<string, number>>();

  // Oldest → newest for left-to-right time.
  for (const e of [...dated].sort((a, b) => a.timestamp - b.timestamp)) {
    const key = dayFmt(e.timestamp);
    if (!seen.has(key)) {
      seen.add(key);
      dayKeys.push(key);
    }
    if (!assets.includes(e.asset)) assets.push(e.asset);
    const m = byDayAsset.get(key) ?? new Map<string, number>();
    m.set(e.asset, (m.get(e.asset) ?? 0) + Number(e.amount));
    byDayAsset.set(key, m);
  }

  const series = assets.map((asset, i) => ({
    name: assetLabel(asset),
    color: CHART_COLORS[i % CHART_COLORS.length],
    points: dayKeys.map((d) => byDayAsset.get(d)?.get(asset) ?? 0),
  }));

  return { labels: dayKeys, series };
}

/** Serialize events to CSV for the Transactions export. */
export function toCSV(events: LedgerEvent[]): string {
  const head = ["txid", "from", "to", "amount", "asset", "ledgerIndex", "timestamp"];
  const rows = events.map((e) =>
    [e.txid, e.from, e.to, e.amount, e.asset, e.ledgerIndex, e.timestamp]
      .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
      .join(","),
  );
  return [head.join(","), ...rows].join("\n");
}
