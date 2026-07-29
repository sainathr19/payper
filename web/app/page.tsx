"use client";

import { useMemo, useState } from "react";
import { useLedger } from "../lib/useLedger";
import AreaChart from "../components/AreaChart";
import CopyButton from "../components/CopyButton";
import {
  EXPLORER,
  assetLabel,
  computeInsights,
  dailySeries,
  filterByRange,
  fullTime,
  relativeTime,
  shortId,
  trimAmount,
  type Range,
} from "../lib/api";

const RANGES: { key: Range; label: string }[] = [
  { key: "day", label: "Past day" },
  { key: "week", label: "Past week" },
  { key: "month", label: "Past month" },
  { key: "all", label: "All time" },
];

export default function DashboardPage() {
  const { events, status, offline, loading, isFresh } = useLedger();
  const [range, setRange] = useState<Range>("all");

  const inRange = useMemo(() => filterByRange(events, range), [events, range]);
  const ins = useMemo(() => computeInsights(inRange), [inRange]);
  const chart = useMemo(() => dailySeries(inRange), [inRange]);

  const revenue = Object.entries(ins.revenueByAsset);
  const primaryAsset = revenue.length ? assetLabel(revenue[0][0]) : "";

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p className="sub">Overview of your settlement activity</p>
        </div>
        <span className={`live-badge ${status}`}>
          <span className="dot" />
          {status === "live" ? "Live" : status === "connecting" ? "Connecting" : "Reconnecting"}
        </span>
      </div>

      {offline && (
        <div className="notice">
          Backend not reachable. Start it with{" "}
          <code>WATCH_ACCOUNTS=r… pnpm --filter @payper/backend dev</code>.
        </div>
      )}

      <div className="tabs" role="tablist" aria-label="Time range">
        {RANGES.map((r) => (
          <button
            key={r.key}
            role="tab"
            aria-selected={range === r.key}
            className={`tab${range === r.key ? " active" : ""}`}
            onClick={() => setRange(r.key)}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="grid stats">
        <Stat label="Settled payments" value={loading ? null : String(ins.count)} />
        <Stat label="Paying agents" value={loading ? null : String(ins.agents)} />
        <Stat
          label="Revenue"
          value={
            loading
              ? null
              : revenue.length
                ? revenue.map(([a, v]) => `${trimAmount(v)} ${assetLabel(a)}`).join("  ·  ")
                : "—"
          }
          small={revenue.length > 1}
        />
      </div>

      <div className="dash">
        <div className="card card-pad">
          <h2 className="section-title">Volume by asset</h2>
          <p className="section-sub">Daily settled volume · native units</p>
          <div style={{ marginTop: "1rem" }}>
            {chart.labels.length ? (
              <AreaChart labels={chart.labels} series={chart.series} formatY={(v) => trimAmount(v)} />
            ) : (
              <div className="empty">No settled volume in this range yet.</div>
            )}
          </div>
        </div>

        <div className="card card-pad insights">
          <h2 className="section-title">Insights</h2>
          <p className="section-sub" style={{ marginBottom: "1rem" }}>
            {rangeLabel(range)}
          </p>
          {ins.count === 0 ? (
            <p className="muted">No activity in this range.</p>
          ) : (
            <>
              <p>
                Average trade is{" "}
                <strong>
                  {trimAmount(Object.values(ins.avgByAsset)[0] ?? 0)} {primaryAsset}
                </strong>{" "}
                across <strong>{ins.count}</strong> tx.
              </p>
              <p>
                Each paying agent averages <strong>{ins.txPerAgent.toFixed(1)}</strong> tx.
              </p>
              <p>
                Settlement success rate is <strong>{ins.successRate}%</strong>.
              </p>
            </>
          )}
        </div>
      </div>

      <div className="card card-pad" style={{ marginTop: "1rem" }}>
        <div className="row-between" style={{ marginBottom: "0.9rem" }}>
          <h2 className="section-title">Live payment feed</h2>
          <span className="muted" style={{ fontSize: "0.82rem" }}>
            {loading ? "loading…" : inRange.length ? `${inRange.length} shown` : "waiting…"}
          </span>
        </div>

        {loading ? (
          <SkeletonRows />
        ) : inRange.length === 0 ? (
          <p className="empty">
            No settled payments yet. Point the indexer at a merchant and send one.
          </p>
        ) : (
          <div className="tablewrap">
            <table className="data">
              <thead>
                <tr>
                  <th>When</th>
                  <th>From</th>
                  <th>Amount</th>
                  <th>Tx</th>
                </tr>
              </thead>
              <tbody>
                {inRange.map((e) => (
                  <tr key={e.txid} className={isFresh(e.txid) ? "row-in" : undefined}>
                    <td className="muted" title={fullTime(e.timestamp)}>
                      {relativeTime(e.timestamp)}
                    </td>
                    <td className="mono">{shortId(e.from)}</td>
                    <td>
                      <span className="amount">{trimAmount(e.amount)}</span>{" "}
                      <span className="asset">{assetLabel(e.asset)}</span>
                    </td>
                    <td>
                      <span className="copy">
                        <a
                          className="mono link"
                          href={`${EXPLORER}/transactions/${e.txid}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {shortId(e.txid)}
                        </a>
                        <CopyButton value={e.txid} label="transaction hash" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value, small }: { label: string; value: string | null; small?: boolean }) {
  return (
    <div className="card stat">
      <div className="label">{label}</div>
      {value === null ? (
        <div className="skel" style={{ width: "60%", height: 26, marginTop: "0.6rem" }} />
      ) : (
        <div className={`value${small ? " sm" : ""}`}>{value}</div>
      )}
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="stack" style={{ gap: "0.9rem", padding: "0.5rem 0" }}>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="skel" style={{ width: `${90 - i * 8}%` }} />
      ))}
    </div>
  );
}

function rangeLabel(r: Range): string {
  return r === "all" ? "All time" : r === "day" ? "Past day" : r === "week" ? "Past week" : "Past month";
}
