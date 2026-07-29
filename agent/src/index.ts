import { Client } from "xrpl";
import { runLoop } from "./loop.js";

const TESTNET_WSS = "wss://s.altnet.rippletest.net:51233";

interface Args {
  target: string;
  count: number;
  intervalMs: number;
}

/**
 * Parse `argv`: the first positional is the target URL; `--count N` (0 = run
 * until Ctrl-C) and `--interval S` (seconds between calls) tune the loop.
 */
function parseArgs(argv: string[]): Args {
  const args: Args = {
    target: "http://localhost:8787/inference",
    count: 5,
    intervalMs: 3000,
  };
  const rest = argv.slice(2);
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === undefined) continue;
    if (arg === "--count") args.count = Number(rest[++i]);
    else if (arg === "--interval") args.intervalMs = Number(rest[++i]) * 1000;
    else if (!arg.startsWith("--")) args.target = arg;
  }
  return args;
}

/**
 * Autonomous reference agent (mirrors the XRPL AI Starter Kit's Agent Wallet +
 * Payment skills). Funds a testnet wallet, then pays for a resource on a loop —
 * the demo's source of continuous, real settled volume.
 *
 *   pnpm --filter @payper/agent start http://localhost:8787/inference --count 10 --interval 2
 */
async function main(): Promise<void> {
  const { target, count, intervalMs } = parseArgs(process.argv);

  const client = new Client(TESTNET_WSS);
  await client.connect();
  try {
    const { wallet } = await client.fundWallet();
    console.log(`[agent] funded wallet ${wallet.address}`);
    console.log(
      `[agent] paying ${target} — ${count > 0 ? `${count} calls` : "until Ctrl-C"}, ` +
        `every ${intervalMs / 1000}s\n`,
    );

    const summary = await runLoop(target, client, wallet, { count, intervalMs });

    console.log(
      `\n[agent] done — ${summary.settled}/${summary.attempts} settled, ${summary.failed} failed`,
    );
    if (summary.failed > 0) process.exitCode = 1;
  } finally {
    await client.disconnect();
  }
}

main().catch((err) => {
  console.error("[agent] failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
