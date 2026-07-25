/**
 * W1–2 spike: prove the full x402 loop settles on-ledger.
 *
 * Runs entirely on XRPL testnet with the direct-XRPL facilitator (no external
 * dependency), exercising the REAL Payper components end to end:
 *
 *   quote (PaymentRequirements)  →  agent signs a presigned Payment
 *     →  facilitator.verify  →  facilitator.settle  →  validated on-ledger txid
 *
 * The t54 facilitator later drops in behind the same Facilitator interface.
 *
 *   pnpm --filter @payper/scripts spike
 */
import { Client } from "xrpl";
import {
  DirectXrplFacilitator,
  NETWORK,
  X402_VERSION,
  makeInvoiceId,
  signXrplPayment,
  type FacilitatorRequest,
  type PaymentRequirements,
} from "@payper/sdk";

const TESTNET_WSS = "wss://s.altnet.rippletest.net:51233";
const PRICE_DROPS = "100000"; // 0.1 XRP

async function main(): Promise<void> {
  const client = new Client(TESTNET_WSS);
  await client.connect();

  try {
    console.log("[spike] funding testnet wallets (faucet)…");
    const [{ wallet: agent }, { wallet: merchant }] = await Promise.all([
      client.fundWallet(),
      client.fundWallet(),
    ]);
    console.log(`[spike]   agent    = ${agent.address}`);
    console.log(`[spike]   merchant = ${merchant.address}`);

    // 1. The gateway's quote for a paid endpoint.
    const requirements: PaymentRequirements = {
      scheme: "exact",
      network: NETWORK.testnet,
      amount: PRICE_DROPS,
      asset: "XRP",
      payTo: merchant.address,
      maxTimeoutSeconds: 120,
      resource: "/inference",
      extra: { invoiceId: makeInvoiceId() },
    };

    // 2. The agent signs a presigned Payment for the quote.
    const payload = await signXrplPayment(client, agent, requirements);
    console.log("[spike] agent signed a presigned Payment");

    // 3. Facilitator verify + settle (direct-XRPL path).
    const facilitator = new DirectXrplFacilitator(client);
    const facReq: FacilitatorRequest = {
      x402Version: X402_VERSION,
      paymentPayload: payload,
      paymentRequirements: requirements,
    };

    const verdict = await facilitator.verify(facReq);
    if (!verdict.isValid) throw new Error(`verify failed: ${verdict.invalidReason}`);
    console.log(`[spike] verified (payer ${verdict.payer})`);

    const receipt = await facilitator.settle(facReq);
    if (!receipt.success) throw new Error(`settle failed: ${receipt.errorReason}`);

    console.log("\n✅ settled on-ledger");
    console.log(`   txid     : ${receipt.transaction}`);
    console.log(`   explorer : https://testnet.xrpl.org/transactions/${receipt.transaction}`);
  } finally {
    await client.disconnect();
  }
}

main().catch((err) => {
  console.error("[spike] failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
