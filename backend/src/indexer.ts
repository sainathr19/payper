/**
 * Watches merchant accounts on XRPL and surfaces settled Payments.
 *
 * Real implementation: subscribe to rippled (or query Clio) for `Payment`
 * transactions to each merchant account, reconcile `nonce -> txid -> usage`,
 * and emit ledger events the dashboard streams in real time.
 */
export interface LedgerEvent {
  txid: string;
  account: string;
  amount: string;
  asset: "XRP" | "RLUSD";
  ledgerIndex: number;
  timestamp: number;
}

export class Indexer {
  constructor(private readonly accounts: string[]) {}

  /** Begin streaming settled payments for the watched accounts. */
  async start(_onEvent: (e: LedgerEvent) => void): Promise<void> {
    // TODO: open a WebSocket to XRPL_ENDPOINT, `subscribe` to accounts, map txns -> LedgerEvent.
    throw new Error("Indexer.start not implemented (W6–8)");
  }
}
