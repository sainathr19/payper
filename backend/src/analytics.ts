import type { LedgerEvent } from "./indexer.js";

export interface RevenueByEndpoint {
  resource: string;
  count: number;
  total: string;
}

/** Rolls indexed ledger events into the numbers the dashboard shows. */
export class Analytics {
  private readonly events: LedgerEvent[] = [];

  record(e: LedgerEvent): void {
    this.events.push(e);
  }

  txCount(): number {
    return this.events.length;
  }

  payingAgents(): number {
    return new Set(this.events.map((e) => e.account)).size;
  }

  // TODO: group by resource once events carry the paid endpoint.
  revenueByEndpoint(): RevenueByEndpoint[] {
    return [];
  }
}
