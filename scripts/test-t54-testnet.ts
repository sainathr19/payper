/**
 * Live integration test against t54's XRPL testnet facilitator.
 *
 * Same loop as the spike, but settlement goes through the REAL facilitator over
 * HTTP (POST /verify, /settle) instead of the direct-XRPL path — proving the
 * `T54Facilitator` client matches the running service.
 *
 *   pnpm --filter @payper/scripts test:t54
 */
import { Client } from "xrpl";
import {
  DEFAULT_SOURCE_TAG,
  NETWORK,
  T54_FACILITATOR,
  T54Facilitator,
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
    console.log("[t54] funding testnet wallets (faucet)…");
    const [{ wallet: agent }, { wallet: merchant }] = await Promise.all([
      client.fundWallet(),
      client.fundWallet(),
    ]);
    console.log(`[t54]   agent    = ${agent.address}`);
    console.log(`[t54]   merchant = ${merchant.address}`);

    const requirements: PaymentRequirements = {
      scheme: "exact",
      network: NETWORK.testnet,
      amount: PRICE_DROPS,
      asset: "XRP",
      payTo: merchant.address,
      maxTimeoutSeconds: 120,
      resource: "/inference",
      extra: { invoiceId: makeInvoiceId(), sourceTag: DEFAULT_SOURCE_TAG },
    };

    const payload = await signXrplPayment(client, agent, requirements);
    console.log("[t54] agent signed a presigned Payment");

    const facilitator = new T54Facilitator(T54_FACILITATOR.testnet);
    const facReq: FacilitatorRequest = {
      x402Version: X402_VERSION,
      paymentPayload: payload,
      paymentRequirements: requirements,
    };

    console.log(`[t54] POST ${T54_FACILITATOR.testnet}/verify`);
    const verdict = await facilitator.verify(facReq);
    console.log("[t54] verify →", JSON.stringify(verdict));
    if (!verdict.isValid) throw new Error(`verify rejected: ${verdict.invalidReason}`);

    console.log(`[t54] POST ${T54_FACILITATOR.testnet}/settle`);
    const receipt = await facilitator.settle(facReq);
    console.log("[t54] settle →", JSON.stringify(receipt));
    if (!receipt.success) throw new Error(`settle failed: ${receipt.errorReason}`);

    console.log("\n✅ settled through the live t54 facilitator");
    console.log(`   txid     : ${receipt.transaction}`);
    console.log(`   explorer : https://testnet.xrpl.org/transactions/${receipt.transaction}`);
  } finally {
    await client.disconnect();
  }
}

main().catch((err) => {
  console.error("[t54] failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
