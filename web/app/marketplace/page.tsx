"use client";

import { useEffect, useState } from "react";
import { Store, Zap, Check, ExternalLink, Loader2 } from "lucide-react";
import {
  getServices,
  payService,
  priceDisplay,
  assetLabel,
  shortId,
  type Service,
  type PayOutcome,
} from "../../lib/api";

type PayState =
  | { phase: "idle" }
  | { phase: "paying" }
  | { phase: "done"; result: PayOutcome }
  | { phase: "error"; message: string };

export default function MarketplacePage() {
  const [services, setServices] = useState<Service[] | null>(null);
  const [offline, setOffline] = useState(false);
  const [pay, setPay] = useState<Record<string, PayState>>({});

  useEffect(() => {
    getServices()
      .then(setServices)
      .catch(() => setOffline(true));
  }, []);

  async function onPay(id: string, path: string) {
    setPay((p) => ({ ...p, [id]: { phase: "paying" } }));
    try {
      const result = await payService(path);
      setPay((p) => ({ ...p, [id]: { phase: "done", result } }));
    } catch (err) {
      setPay((p) => ({
        ...p,
        [id]: { phase: "error", message: err instanceof Error ? err.message : "payment failed" },
      }));
    }
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Marketplace</h1>
          <p className="sub">x402-priced services — pay per call, settled on XRPL testnet</p>
        </div>
      </div>

      {offline && (
        <div className="notice">
          Backend not reachable. Start it with{" "}
          <code>WATCH_ACCOUNTS=r… pnpm --filter @payper/backend dev</code>.
        </div>
      )}

      <div className="grid listings">
        {services === null && !offline
          ? [0, 1, 2, 3].map((i) => (
              <div key={i} className="card listing">
                <div className="skel" style={{ width: "60%", height: 16 }} />
                <div className="skel" style={{ width: "90%" }} />
                <div className="skel" style={{ width: "40%", height: 28 }} />
              </div>
            ))
          : (services ?? []).map((s) => {
              const ep = s.endpoints[0];
              const state = pay[s.id] ?? { phase: "idle" };
              return (
                <article key={s.id} className="card listing">
                  <div className="brand-mark" aria-hidden>
                    <Store size={18} strokeWidth={1.75} />
                  </div>
                  <h3>{s.name}</h3>
                  <p className="desc">{ep?.description}</p>
                  <div className="endpoint">GET {ep?.path}</div>
                  <div className="price-row">
                    <span className="price">
                      {ep ? priceDisplay(ep.price, ep.asset) : "—"}{" "}
                      <span className="asset">{ep ? assetLabel(ep.asset) : ""}</span>
                    </span>
                    <button
                      className="btn primary"
                      onClick={() => ep && onPay(s.id, ep.path)}
                      disabled={state.phase === "paying"}
                    >
                      {state.phase === "paying" ? (
                        <>
                          <Loader2 className="spin" aria-hidden />
                          Settling…
                        </>
                      ) : (
                        <>
                          <Zap aria-hidden />
                          Pay &amp; call
                        </>
                      )}
                    </button>
                  </div>

                  {state.phase === "done" && <PayResult result={state.result} />}
                  {state.phase === "error" && <div className="pay-result err">{state.message}</div>}
                </article>
              );
            })}
      </div>
    </section>
  );
}

function PayResult({ result }: { result: PayOutcome }) {
  const ok = result.status === 200 && result.txid;
  return (
    <div className={`pay-result ${ok ? "ok" : "err"}`}>
      {ok ? (
        <>
          <div className="pay-line">
            <span className="status ok">
              <Check size={13} aria-hidden /> Settled
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
