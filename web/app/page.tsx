"use client";

import { useEffect, useRef, useState } from "react";
import {
  EXPLORER,
  assetLabel,
  getAnalytics,
  getEvents,
  relativeTime,
  shortId,
  streamEvents,
  type Analytics,
  type LedgerEvent,
  type StreamStatus,
} from "../lib/api";

const MAX_ROWS = 60;

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [events, setEvents] = useState<LedgerEvent[]>([]);
  const [status, setStatus] = useState<StreamStatus>("connecting");
  const [offline, setOffline] = useState(false);
  const seen = useRef<Set<string>>(new Set());

  function ingest(list: LedgerEvent[]) {
    setEvents((prev) => {
      const fresh = list.filter((e) => e.txid && !seen.current.has(e.txid));
      fresh.forEach((e) => seen.current.add(e.txid));
      if (fresh.length === 0) return prev;
      return [...fresh, ...prev].slice(0, MAX_ROWS);
    });
  }

  useEffect(() => {
    let es: EventSource | undefined;

    (async () => {
      try {
        const [a, e] = await Promise.all([getAnalytics(), getEvents()]);
        setAnalytics(a);
        ingest(e);
      } catch {
        setOffline(true);
      }
    })();

    es = streamEvents(
      (e) => {
        ingest([e]);
        getAnalytics().then(setAnalytics).catch(() => {});
      },
      setStatus,
    );

    return () => es?.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const revenue = analytics ? Object.entries(analytics.revenueByAsset) : [];

  return (
    <section>
      <div className="head">
        <div>
          <h1>The agent economy, live</h1>
          <p className="accent">One settled XRPL payment per API call.</p>
        </div>
        <span className={`live-badge ${status}`}>
          <span className="dot" />
          {status === "live" ? "Live" : status === "connecting" ? "Connecting" : "Reconnecting"}
        </span>
      </div>

      {offline && (
        <div className="notice">
          Backend not reachable at the API URL. Start it with{" "}
          <code>WATCH_ACCOUNTS=r… pnpm --filter @payper/backend dev</code>.
        </div>
      )}

      <div className="cards">
        <Stat label="Settled payments" value={analytics ? String(analytics.txCount) : "—"} />
        <Stat label="Paying agents" value={analytics ? String(analytics.payingAgents) : "—"} />
        <Stat
          label="Revenue"
          value={
            revenue.length
              ? revenue.map(([a, v]) => `${trim(v)} ${assetLabel(a)}`).join("  ·  ")
              : "—"
          }
        />
      </div>

      <div className="card feed">
        <div className="feed-head">
          <span className="label">Live payment feed</span>
          <span className="muted">{events.length ? `${events.length} shown` : "waiting…"}</span>
        </div>

        {events.length === 0 ? (
          <p className="muted empty">
            No settled payments yet. Point the indexer at a merchant account and send one.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>From</th>
                <th>Amount</th>
                <th>Tx</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.txid} className="row">
                  <td className="muted">{relativeTime(e.timestamp)}</td>
                  <td className="mono">{shortId(e.from)}</td>
                  <td>
                    <span className="amount">{trim(e.amount)}</span>{" "}
                    <span className="badge">{assetLabel(e.asset)}</span>
                  </td>
                  <td>
                    <a
                      className="mono link"
                      href={`${EXPLORER}/transactions/${e.txid}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {shortId(e.txid)}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <div className="value">{value}</div>
      <div className="label">{label}</div>
    </div>
  );
}

function trim(v: string): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
}
