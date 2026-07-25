// Developer console — register a service, connect wallet, set RLUSD trust line,
// and wrap an endpoint with one line of Payper middleware.
export default function ConsolePage() {
  return (
    <section>
      <h1>Developer console</h1>
      <p style={{ color: "var(--muted)" }}>Monetize any endpoint in one line.</p>
      <div className="card">
        <pre style={{ margin: 0, overflowX: "auto" }}>
          {`app.get("/inference",
  payper({ price: "0.01", asset: rlusd, payTo, facilitator }),
  handler)`}
        </pre>
      </div>
    </section>
  );
}
