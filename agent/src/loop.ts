import type { Client, Wallet } from "xrpl";
import { payFor, type PayResult } from "./pay.js";

export interface LoopOptions {
  /** Number of paid calls to make. `0` (or negative) loops until interrupted. */
  count?: number;
  /** Delay between calls, in milliseconds. */
  intervalMs?: number;
  /** Per-attempt callback (settled or failed). Defaults to a console logger. */
  onResult?: (result: LoopTick) => void;
}

/** One iteration of the loop: its ordinal, the pay outcome, and any error. */
export interface LoopTick {
  index: number;
  result?: PayResult;
  error?: Error;
}

/** Aggregate outcome of a loop run. */
export interface LoopSummary {
  attempts: number;
  settled: number;
  failed: number;
  /** Validated XRPL transaction hashes, in settlement order. */
  txids: string[];
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Drive a funded `wallet` through repeated pay-per-call requests to `url` — the
 * demo's source of continuous, real on-chain volume. The caller owns the
 * connected `client` and the wallet's funding; this just loops `payFor`.
 *
 * Stops after `count` calls (or runs until `stop()` / SIGINT when `count <= 0`),
 * waiting `intervalMs` between attempts. A failed attempt is logged and counted
 * but never halts the loop — the point is durable, ongoing volume.
 */
export async function runLoop(
  url: string,
  client: Client,
  wallet: Wallet,
  options: LoopOptions = {},
): Promise<LoopSummary> {
  const { count = 0, intervalMs = 3000, onResult = logTick } = options;
  const forever = count <= 0;

  const summary: LoopSummary = { attempts: 0, settled: 0, failed: 0, txids: [] };

  let stopped = false;
  const stop = (): void => {
    stopped = true;
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);

  try {
    for (let i = 0; forever || i < count; i++) {
      if (stopped) break;
      summary.attempts++;

      try {
        const result = await payFor(url, client, wallet);
        if (result.status === 200 && result.txid) {
          summary.settled++;
          summary.txids.push(result.txid);
        } else {
          summary.failed++;
        }
        onResult({ index: i, result });
      } catch (err) {
        summary.failed++;
        onResult({ index: i, error: err instanceof Error ? err : new Error(String(err)) });
      }

      const isLast = !forever && i === count - 1;
      if (!isLast && !stopped) await sleep(intervalMs);
    }
  } finally {
    process.removeListener("SIGINT", stop);
    process.removeListener("SIGTERM", stop);
  }

  return summary;
}

/** Default per-tick logger: one line per attempt with a txid + explorer link. */
function logTick({ index, result, error }: LoopTick): void {
  const n = index + 1;
  if (error) {
    console.error(`[agent] #${n} ✗ ${error.message}`);
    return;
  }
  if (result && result.status === 200 && result.txid) {
    console.log(`[agent] #${n} ✓ settled ${result.txid}`);
    if (result.explorer) console.log(`[agent]      ${result.explorer}`);
    return;
  }
  console.error(`[agent] #${n} ✗ HTTP ${result?.status ?? "?"} (not settled)`);
}
