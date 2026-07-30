"use client";

import { useEffect, useState } from "react";
import { Send, Zap, Check, ExternalLink, Loader2 } from "lucide-react";
import CopyButton from "../../components/CopyButton";
import {
  getServices,
  inspectService,
  payService,
  priceDisplay,
  assetLabel,
  shortId,
  type Service,
  type Requirements,
  type PayOutcome,
} from "../../lib/api";

const SNIPPET = `app.get("/inference",
  payper({ price: "0.01", asset: rlusd, payTo, facilitator }),
  handler);`;

type InspectState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "done"; status: number; quote: Requirements | null }
  | { phase: "error"; message: string };

type SettleState =
  | { phase: "idle" }
  | { phase: "paying" }
  | { phase: "done"; result: PayOutcome }
  | { phase: "error"; message: string };

export default function ConsolePage() {
  const [services, setServices] = useState<Service[]>([]);
  const [path, setPath] = useState("");
  const [offline, setOffline] = useState(false);
  const [inspect, setInspect] = useState<InspectState>({ phase: "idle" });
  const [settle, setSettle] = useState<SettleState>({ phase: "idle" });

  useEffect(() => {
    getServices()
      .then((s) => {
        setServices(s);
        setPath(s[0]?.endpoints[0]?.path ?? "");
      })
      .catch(() => setOffline(true));
  }, []);

  function reset() {
    setInspect({ phase: "idle" });
    setSettle({ phase: "idle" });
  }

  async function onSend() {
    setSettle({ phase: "idle" });
    setInspect({ phase: "loading" });
    try {
      const { status, quote } = await inspectService(path);
      setInspect({ phase: "done", status, quote: quote?.accepts[0] ?? null });
    } catch (err) {
      setInspect({ phase: "error", message: err instanceof Error ? err.message : "request failed" });
    }
  }

  async function onSettle() {
    setSettle({ phase: "paying" });
    try {
      setSettle({ phase: "done", result: await payService(path) });
    } catch (err) {
      setSettle({ phase: "error", message: err instanceof Error ? err.message : "payment failed" });
    }
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Console</h1>
          <p className="sub">Test the x402 handshake, then integrate in one line</p>
        </div>
      </div>

      {offline && (
        <div className="notice">
          Backend not reachable. Start it with{" "}
          <code>WATCH_ACCOUNTS=r… pnpm --filter @payper/backend dev</code>.
        </div>
      )}

      <div className="stack">
        {/* ---- Live request tester ---- */}
        <div className="card card-pad">
          <h2 className="section-title">Request tester</h2>
          <p className="section-sub" style={{ marginBottom: "1rem" }}>
            Send an unpaid request to see the <span className="mono">402</span> quote, then settle
            it live on XRPL testnet.
          </p>

          <div className="toolbar" style={{ marginBottom: inspect.phase === "idle" ? 0 : "1rem" }}>
            <select
              className="select"
              value={path}
              onChange={(e) => {
                setPath(e.target.value);
                reset();
              }}
              aria-label="Endpoint"
              style={{ flex: 1, minWidth: 240 }}
            >
              {services.map((s) => {
                const ep = s.endpoints[0];
                return (
                  <option key={s.id} value={ep?.path}>
                    GET {ep?.path} — {s.name}
                  </option>
                );
              })}
            </select>
            <button className="btn" onClick={onSend} disabled={!path || inspect.phase === "loading"}>
              {inspect.phase === "loading" ? <Loader2 className="spin" aria-hidden /> : <Send aria-hidden />}
              Send request
            </button>
          </div>

          {inspect.phase === "error" && <div className="pay-result err">{inspect.message}</div>}

          {inspect.phase === "done" && (
            <div className="stack" style={{ gap: "0.9rem" }}>
              <div className="step">
                <span className="status warn">HTTP {inspect.status} · Payment Required</span>
                <span className="faint" style={{ fontSize: "0.8rem" }}>
                  the seller quotes the call; nothing is signed yet
                </span>
              </div>

              {inspect.quote ? (
                <>
                  <dl className="kv quote">
                    <dt>Price</dt>
                    <dd>
                      {priceDisplay(inspect.quote.amount, inspect.quote.asset)}{" "}
                      {assetLabel(inspect.quote.asset)}
                    </dd>
                    <dt>Pay to</dt>
                    <dd>{shortId(inspect.quote.payTo, 8)}</dd>
                    <dt>Network</dt>
                    <dd>{inspect.quote.network}</dd>
                    <dt>Scheme</dt>
                    <dd>{inspect.quote.scheme}</dd>
                    <dt>Invoice ID</dt>
                    <dd>{shortId(String(inspect.quote.extra?.invoiceId ?? "—"), 8)}</dd>
                    <dt>Source tag</dt>
                    <dd>{String(inspect.quote.extra?.sourceTag ?? "—")}</dd>
                    <dt>Max timeout</dt>
                    <dd>{inspect.quote.maxTimeoutSeconds ?? "—"}s</dd>
                  </dl>

                  <div className="step">
                    <button
                      className="btn primary"
                      onClick={onSettle}
                      disabled={settle.phase === "paying"}
                    >
                      {settle.phase === "paying" ? (
                        <>
                          <Loader2 className="spin" aria-hidden /> Settling…
                        </>
                      ) : (
                        <>
                          <Zap aria-hidden /> Pay &amp; settle
                        </>
                      )}
                    </button>
                    <span className="faint" style={{ fontSize: "0.8rem" }}>
                      signs an XRPL payment for these terms and retries
                    </span>
                  </div>

                  {settle.phase === "error" && (
                    <div className="pay-result err">{settle.message}</div>
                  )}
                  {settle.phase === "done" && <Receipt result={settle.result} />}
                </>
              ) : (
                <div className="pay-result">No PAYMENT-REQUIRED quote on this response.</div>
              )}
            </div>
          )}
        </div>

        {/* ---- Integration reference ---- */}
        <div className="card card-pad">
          <div className="row-between" style={{ marginBottom: "0.9rem" }}>
            <div>
              <h2 className="section-title">One-line integration</h2>
              <p className="section-sub">
                Wrap a handler with the Payper middleware — it issues the 402 quote, verifies the
                signed payment, and settles through the facilitator.
              </p>
            </div>
            <CopyButton value={SNIPPET} label="snippet" />
          </div>
          <pre className="code">
            <code>
              <span className="c">{"// Express — pay-per-call in one line"}</span>
              {"\n"}
              <span className="k">app</span>.get(<span className="s">&quot;/inference&quot;</span>,{"\n"}
              {"  "}
              <span className="k">payper</span>({"{ "}price:{" "}
              <span className="s">&quot;0.01&quot;</span>, asset: rlusd, payTo, facilitator{" }"}),
              {"\n"}
              {"  "}handler);
            </code>
          </pre>
        </div>

        <div className="card card-pad">
          <h2 className="section-title">Environment</h2>
          <p className="section-sub" style={{ marginBottom: "1rem" }}>
            Sample values — replace with your own testnet account and facilitator.
          </p>
          <dl className="kv">
            <dt>Network</dt>
            <dd>xrpl:testnet</dd>
            <dt>Facilitator</dt>
            <dd>xrpl-facilitator-testnet.t54.ai</dd>
            <dt>Asset</dt>
            <dd>RLUSD · 524C555344…</dd>
            <dt>Scheme</dt>
            <dd>exact (x402 v2)</dd>
          </dl>
        </div>

        <div className="card card-pad">
          <div className="row-between">
            <div>
              <h2 className="section-title">API key</h2>
              <p className="section-sub">Sample server key — not a live credential.</p>
            </div>
            <span className="status ok">Active</span>
          </div>
          <div
            className="endpoint"
            style={{ marginTop: "1rem", display: "flex", justifyContent: "space-between", gap: "1rem" }}
          >
            <span>pk_test_••••••••••••••••••••••••••••</span>
            <CopyButton value="pk_test_sample_key_replace_me" label="key" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Receipt({ result }: { result: PayOutcome }) {
  const ok = result.status === 200 && result.txid;
  return (
    <div className={`pay-result ${ok ? "ok" : "err"}`}>
      {ok ? (
        <>
          <div className="pay-line">
            <span className="status ok">
              <Check size={13} aria-hidden /> HTTP 200 · Settled
            </span>
            {result.explorer && (
              <a className="mono link" href={result.explorer} target="_blank" rel="noreferrer">
                {shortId(result.txid!)} <ExternalLink size={12} aria-hidden />
              </a>
            )}
          </div>
          <pre className="pay-body">{JSON.stringify(result.body, null, 2)}</pre>
        </>
      ) : (
        <>Payment did not settle (HTTP {result.status}).</>
      )}
    </div>
  );
}
