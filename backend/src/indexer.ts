import { Client, dropsToXrp, rippleTimeToUnixTime } from "xrpl";
import { DEFAULT_SOURCE_TAG } from "@payper/sdk";

/** A settled inbound payment to a watched merchant account. */
export interface LedgerEvent {
  txid: string;
  /** Payer (tx Account). */
  from: string;
  /** Merchant (tx Destination). */
  to: string;
  /** Human amount: XRP units, or the IOU value. */
  amount: string;
  /** "XRP" or an issued-currency code. */
  asset: string;
  issuer?: string;
  ledgerIndex: number;
  /** Unix seconds (0 if not yet known). */
  timestamp: number;
  /** On-chain InvoiceID (SHA256 of the invoice id) for reconciliation, if present. */
  invoiceIdHash?: string;
}

/** Loose shape covering both the tx stream and account_tx across xrpl.js API versions. */
interface RawTxMessage {
  tx_json?: Record<string, unknown>;
  transaction?: Record<string, unknown>;
  tx?: Record<string, unknown>;
  meta?: unknown;
  metaData?: unknown;
  hash?: string;
  ledger_index?: number;
}

type IssuedAmount = { currency: string; issuer: string; value: string };

function parseAmount(a: unknown): { asset: string; amount: string; issuer?: string } {
  if (typeof a === "string") return { asset: "XRP", amount: String(dropsToXrp(a)) };
  const io = a as IssuedAmount;
  return { asset: io.currency, amount: io.value, issuer: io.issuer };
}

/**
 * Watches merchant accounts on XRPL and surfaces settled Payments. Subscribes to
 * the live transaction stream and can backfill recent history via `account_tx`,
 * so the dashboard has data on load and updates in real time.
 */
export class Indexer {
  private readonly client: Client;
  private readonly watched: Set<string>;
  private readonly handlers: Array<(e: LedgerEvent) => void> = [];

  constructor(endpoint: string, accounts: string[]) {
    this.client = new Client(endpoint);
    this.watched = new Set(accounts);
  }

  /** Register a listener for settled payments. */
  onEvent(handler: (e: LedgerEvent) => void): void {
    this.handlers.push(handler);
  }

  private emit(event: LedgerEvent): void {
    for (const h of this.handlers) h(event);
  }

  /** Connect and subscribe to the live transaction stream for watched accounts. */
  async start(): Promise<void> {
    if (!this.client.isConnected()) await this.client.connect();
    this.client.on("transaction", (msg: unknown) => {
      const event = this.toLedgerEvent(msg as RawTxMessage);
      if (event) this.emit(event);
    });
    await this.client.request({
      command: "subscribe",
      accounts: [...this.watched],
    });
  }

  /** Replay recent inbound payments so the dashboard isn't empty on load. */
  async backfill(limit = 20): Promise<void> {
    for (const account of this.watched) {
      const res = await this.client.request({
        command: "account_tx",
        account,
        limit,
        ledger_index_min: -1,
        ledger_index_max: -1,
      });
      const rows = [...res.result.transactions].reverse();
      for (const row of rows) {
        const r = row as unknown as RawTxMessage & { validated?: boolean };
        const event = this.toLedgerEvent(r);
        if (event) this.emit(event);
      }
    }
  }

  async stop(): Promise<void> {
    if (this.client.isConnected()) await this.client.disconnect();
  }

  private toLedgerEvent(msg: RawTxMessage): LedgerEvent | null {
    const tx = (msg.tx_json ?? msg.transaction ?? msg.tx) as
      | Record<string, unknown>
      | undefined;
    if (!tx || tx["TransactionType"] !== "Payment") return null;

    const to = tx["Destination"] as string | undefined;
    if (!to || !this.watched.has(to)) return null; // only inbound to watched merchants

    // Only x402 pay-per-call settlements, not arbitrary inbound XRP (e.g. faucet
    // funding): the scheme stamps every payment with the x402 SourceTag.
    if (tx["SourceTag"] !== DEFAULT_SOURCE_TAG) return null;

    const meta = (msg.meta ?? msg.metaData) as Record<string, unknown> | undefined;
    const delivered =
      (meta && (meta["delivered_amount"] ?? meta["DeliveredAmount"])) ?? tx["Amount"];
    const { asset, amount, issuer } = parseAmount(delivered);

    const date = tx["date"] as number | undefined;
    return {
      txid: (msg.hash ?? (tx["hash"] as string)) ?? "",
      from: tx["Account"] as string,
      to,
      amount,
      asset,
      ...(issuer ? { issuer } : {}),
      ledgerIndex: (msg.ledger_index ?? (tx["ledger_index"] as number)) ?? 0,
      timestamp: date ? Math.floor(rippleTimeToUnixTime(date) / 1000) : 0,
      ...(tx["InvoiceID"] ? { invoiceIdHash: tx["InvoiceID"] as string } : {}),
    };
  }
}
