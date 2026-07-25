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
