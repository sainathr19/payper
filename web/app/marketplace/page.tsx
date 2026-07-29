// Marketplace — x402-priced services agents can discover and pay for. Listings
// below are clearly-labeled sample services (no live backend offering yet).
import { Store } from "lucide-react";

interface Listing {
  name: string;
  description: string;
  endpoint: string;
  price: string;
  asset: string;
}

const LISTINGS: Listing[] = [
  {
    name: "Inference — GPT-class completion",
    description: "One chat/completion call. Pay-per-request, no key, no subscription.",
    endpoint: "GET /inference",
    price: "0.01",
    asset: "RLUSD",
  },
  {
    name: "Embeddings",
    description: "Vector embeddings for a batch of up to 64 inputs.",
    endpoint: "POST /embeddings",
    price: "0.002",
    asset: "RLUSD",
  },
  {
    name: "Web search",
    description: "Ranked search results with source URLs for agent retrieval.",
    endpoint: "GET /search",
    price: "0.005",
    asset: "RLUSD",
  },
  {
    name: "Image generation",
    description: "One 1024×1024 image. Billed per generated asset.",
    endpoint: "POST /image",
    price: "0.02",
    asset: "RLUSD",
  },
];

export default function MarketplacePage() {
  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Marketplace</h1>
          <p className="sub">x402-priced services agents can discover and pay for</p>
        </div>
        <span className="pill">sample listings</span>
      </div>

      <div className="grid listings">
        {LISTINGS.map((l) => (
          <article key={l.name} className="card listing">
            <div className="brand-mark" aria-hidden>
              <Store size={18} strokeWidth={1.75} />
            </div>
            <h3>{l.name}</h3>
            <p className="desc">{l.description}</p>
            <div className="endpoint">{l.endpoint}</div>
            <div className="price-row">
              <span className="price">
                {l.price} <span className="asset">{l.asset}</span>
              </span>
              <span className="muted" style={{ fontSize: "0.8rem" }}>
                per call
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
