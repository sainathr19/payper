import type { Asset } from "@payper/sdk";

export interface Endpoint {
  path: string;
  price: string;
  asset: Asset;
  description?: string;
}

export interface Service {
  id: string;
  name: string;
  /** Owner XRPL account that receives payments. */
  owner: string;
  endpoints: Endpoint[];
}

/** In-memory registry stub. Swap for a real store (SQLite/Postgres) later. */
export class Registry {
  private readonly services = new Map<string, Service>();

  register(service: Service): void {
    this.services.set(service.id, service);
  }

  get(id: string): Service | undefined {
    return this.services.get(id);
  }

  list(): Service[] {
    return [...this.services.values()];
  }
}
