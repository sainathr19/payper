// Dashboard — the "agent economy" money shot: revenue, paying agents, live tx feed.
// Wire to @payper/backend `/analytics` and a live XRPL payment stream.
export default function DashboardPage() {
  return (
    <section>
      <h1>The agent economy, live</h1>
      <p className="accent">One settled XRPL payment per API call.</p>

      <div className="cards">
        <div className="card">
          <div className="value">—</div>
          <div className="label">Settled payments</div>
        </div>
        <div className="card">
          <div className="value">—</div>
          <div className="label">Paying agents</div>
        </div>
        <div className="card">
          <div className="value">—</div>
          <div className="label">Revenue (RLUSD)</div>
        </div>
      </div>

      <div className="card">
        <div className="label">Live payment feed</div>
        <p style={{ color: "var(--muted)" }}>
          Connect the backend indexer to stream settled XRPL payments here.
        </p>
      </div>
    </section>
  );
}
