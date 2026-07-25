// Marketplace — browse x402-priced services; each listing exposes a machine-readable
// manifest an agent can consume directly. Wire to @payper/backend `/services`.
export default function MarketplacePage() {
  return (
    <section>
      <h1>Marketplace</h1>
      <p style={{ color: "var(--muted)" }}>
        x402-priced services agents can discover and pay for.
      </p>
      <div className="card">Seed 3–4 services here (W6–8).</div>
    </section>
  );
}
