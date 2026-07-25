import type { LedgerEvent } from "./indexer.js";

export interface Analytics {
  txCount: number;
  payingAgents: number;
  revenueByAsset: Record<string, string>;
}

/** Rolls indexed ledger events into the numbers the dashboard shows. */
export class AnalyticsStore {
  private readonly events: LedgerEvent[] = [];
  private readonly seenTxids = new Set<string>();

  /** Record an event, ignoring duplicates (backfill + live stream can overlap). */
  record(e: LedgerEvent): boolean {
    if (this.seenTxids.has(e.txid)) return false;
    this.seenTxids.add(e.txid);
    this.events.push(e);
    return true;
  }

  txCount(): number {
    return this.events.length;
  }

  payingAgents(): number {
    return new Set(this.events.map((e) => e.from)).size;
  }

  /** Total settled amount per asset (summed as decimals; fine for display). */
  revenueByAsset(): Record<string, string> {
    const totals: Record<string, number> = {};
    for (const e of this.events) {
      totals[e.asset] = (totals[e.asset] ?? 0) + Number(e.amount);
    }
    return Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, String(v)]));
  }

  /** Most recent events first, for the live feed. */
  recent(n = 50): LedgerEvent[] {
    return this.events.slice(-n).reverse();
  }

  summary(): Analytics {
    return {
      txCount: this.txCount(),
      payingAgents: this.payingAgents(),
      revenueByAsset: this.revenueByAsset(),
    };
  }
}
