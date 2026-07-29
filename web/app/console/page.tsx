// Developer console — monetize any endpoint in one line of Payper middleware.
import CopyButton from "../../components/CopyButton";

const SNIPPET = `app.get("/inference",
  payper({ price: "0.01", asset: rlusd, payTo, facilitator }),
  handler);`;

export default function ConsolePage() {
  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Console</h1>
          <p className="sub">Monetize any endpoint in one line</p>
        </div>
      </div>

      <div className="stack">
        <div className="card card-pad">
          <div className="row-between" style={{ marginBottom: "0.9rem" }}>
            <div>
              <h2 className="section-title">One-line integration</h2>
              <p className="section-sub">
                Wrap a handler with the Payper middleware — it issues the 402 quote, verifies the
                signed XRPL payment, and settles through the facilitator.
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
