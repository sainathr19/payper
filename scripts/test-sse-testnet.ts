/**
 * Live SSE test: proves the dashboard's data path.
 *
 * Spawns the real @payper/backend server watching a merchant, connects an SSE
 * client to /stream (as the browser does), sends a payment to the merchant, and
 * asserts the settled payment is pushed over the stream. Also checks /analytics.
 *
 *   pnpm --filter @payper/scripts test:sse   (build sdk + backend first)
 */
import { spawn } from "node:child_process";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { Client, type Payment } from "xrpl";

const TESTNET_WSS = "wss://s.altnet.rippletest.net:51233";
const PORT = 8799;
const BASE = `http://127.0.0.1:${PORT}`;
const backendEntry = fileURLToPath(new URL("../backend/dist/server.js", import.meta.url));

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function get(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    http
      .get(`${BASE}${path}`, (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => resolve(body));
      })
      .on("error", reject);
  });
}

async function main(): Promise<void> {
  const sender = new Client(TESTNET_WSS);
  await sender.connect();

  console.log("[sse] funding testnet wallets (faucet)…");
  const [{ wallet: payer }, { wallet: merchant }] = await Promise.all([
    sender.fundWallet(),
    sender.fundWallet(),
  ]);
  console.log(`[sse]   merchant = ${merchant.address}`);

  // Start the real backend, watching the merchant.
  const backend = spawn("node", [backendEntry], {
    env: { ...process.env, PORT: String(PORT), WATCH_ACCOUNTS: merchant.address },
    stdio: ["ignore", "pipe", "pipe"],
  });
  backend.stdout.on("data", (d) => process.stdout.write(`[backend] ${d}`));
  backend.stderr.on("data", (d) => process.stderr.write(`[backend] ${d}`));

  const streamChunks: string[] = [];

  try {
    // Wait for the indexer to be subscribed.
    for (let i = 0; i < 30; i++) {
      const ok = await get("/analytics").then(() => true).catch(() => false);
      if (ok) break;
      await sleep(500);
    }
    await sleep(1500); // let subscribe() settle

    // Connect an SSE client (like the dashboard).
    const req = http.get(`${BASE}/stream`, (res) => {
      res.setEncoding("utf8");
      res.on("data", (c) => streamChunks.push(c));
    });
    console.log("[sse] SSE client connected to /stream");
    await sleep(1000);

    // Send a payment to the watched merchant.
    const tx: Payment = {
      TransactionType: "Payment",
      Account: payer.address,
      Destination: merchant.address,
      Amount: "300000", // 0.3 XRP
    };
    const prepared = await sender.autofill(tx);
    const signed = payer.sign(prepared);
    const submit = await sender.submitAndWait(signed.tx_blob);
    const txid = submit.result.hash;
    console.log(`[sse] sent 0.3 XRP, txid ${txid}`);

    // Wait for it to arrive over SSE.
    for (let i = 0; i < 24 && !streamChunks.join("").includes(txid); i++) await sleep(500);
    req.destroy();

    const streamed = streamChunks.join("");
    if (!streamed.includes(txid)) throw new Error("payment did not arrive over SSE");
    const frame = streamed.split("\n\n").find((f) => f.includes(txid)) ?? "";
    console.log("[sse] SSE frame:", frame.replace(/^data: /, "").trim());

    const analytics = JSON.parse(await get("/analytics"));
    console.log("[sse] /analytics:", JSON.stringify(analytics));
    if (analytics.txCount < 1) throw new Error("analytics did not count the payment");

    console.log("\n✅ settled payment streamed to the dashboard over SSE");
    console.log(`   explorer : https://testnet.xrpl.org/transactions/${txid}`);
  } finally {
    backend.kill("SIGTERM");
    await sender.disconnect();
  }
}

main().catch((err) => {
  console.error("[sse] failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
