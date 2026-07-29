"use client";

import { useMemo, useState } from "react";
import { Search, Download, ArrowRight } from "lucide-react";
import { useLedger } from "../../lib/useLedger";
import CopyButton from "../../components/CopyButton";
import {
  EXPLORER,
  assetLabel,
  fullTime,
  shortId,
  toCSV,
  trimAmount,
  type LedgerEvent,
} from "../../lib/api";

const PAGE_SIZE = 15;

export default function TransactionsPage() {
  const { events, status, offline, loading, isFresh } = useLedger();
  const [q, setQ] = useState("");
  const [asset, setAsset] = useState("all");
  const [page, setPage] = useState(0);

  const assets = useMemo(
    () => Array.from(new Set(events.map((e) => e.asset))),
    [events],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return events.filter((e) => {
      if (asset !== "all" && e.asset !== asset) return false;
      if (!needle) return true;
      return (
        e.txid.toLowerCase().includes(needle) ||
        e.from.toLowerCase().includes(needle) ||
        e.to.toLowerCase().includes(needle)
      );
    });
  }, [events, q, asset]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(page, pages - 1);
  const rows = filtered.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE);

  function exportCsv() {
    const blob = new Blob([toCSV(filtered)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "payper-transactions.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Transactions</h1>
          <p className="sub">Every settled x402 payment for your account</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span className={`live-badge ${status}`}>
            <span className="dot" />
            {status === "live" ? "Live" : status === "connecting" ? "Connecting" : "Reconnecting"}
          </span>
          <button className="btn" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download aria-hidden />
            Export CSV
          </button>
        </div>
      </div>

      {offline && (
        <div className="notice">
          Backend not reachable. Start it with{" "}
          <code>WATCH_ACCOUNTS=r… pnpm --filter @payper/backend dev</code>.
        </div>
      )}

      <div className="toolbar">
        <label className="input">
          <Search aria-hidden />
          <input
            placeholder="Search by tx hash or address…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
          />
        </label>
        <select
          className="select"
          value={asset}
          onChange={(e) => {
            setAsset(e.target.value);
            setPage(0);
          }}
          aria-label="Filter by asset"
        >
          <option value="all">All assets</option>
          {assets.map((a) => (
            <option key={a} value={a}>
              {assetLabel(a)}
            </option>
          ))}
        </select>
      </div>

      <div className="card card-pad">
        {loading ? (
          <div className="stack" style={{ gap: "0.9rem", padding: "0.5rem 0" }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="skel" style={{ width: `${92 - i * 6}%` }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="empty">
            {events.length === 0
              ? "No settled payments yet."
              : "No transactions match your filters."}
          </p>
        ) : (
          <>
            <div className="tablewrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Tx hash</th>
                    <th>Amount</th>
                    <th>From → To</th>
                    <th>Settled</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((e) => (
                    <Row key={e.txid} e={e} fresh={isFresh(e.txid)} />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pager">
              <button
                className="btn"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={clampedPage === 0}
              >
                Previous
              </button>
              <span>
                Showing {clampedPage * PAGE_SIZE + 1}–
                {clampedPage * PAGE_SIZE + rows.length} of {filtered.length}
              </span>
              <button
                className="btn"
                onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
                disabled={clampedPage >= pages - 1}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function Row({ e, fresh }: { e: LedgerEvent; fresh: boolean }) {
  return (
    <tr className={fresh ? "row-in" : undefined}>
      <td>
        <span className="status ok">Completed</span>
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
      <td>
        <span className="amount">{trimAmount(e.amount)}</span>{" "}
        <span className="asset">{assetLabel(e.asset)}</span>
      </td>
      <td>
        <span className="route mono" style={{ fontSize: "0.82rem" }}>
          {shortId(e.from, 5)} <ArrowRight aria-hidden /> {shortId(e.to, 5)}
        </span>
      </td>
      <td className="muted" style={{ whiteSpace: "nowrap" }}>
        {fullTime(e.timestamp)}
      </td>
    </tr>
  );
}
