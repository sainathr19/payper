/**
 * W1–2 spike: prove the full loop end to end on a live network.
 *
 * Goal: one agent pays one endpoint through t54's x402 facilitator, and we can
 * see the settled Payment on-ledger (txid). Everything else in Payper is built
 * on top of this working primitive.
 *
 * Steps to implement:
 *   1. Load a funded XRPL account (testnet first) from env.
 *   2. Hit a Payper-wrapped endpoint → get the 402 quote.
 *   3. Build + presign an XRPL Payment for the quote (xrpl.js / Starter Kit).
 *   4. Submit via the t54 facilitator (T54Facilitator.settle).
 *   5. Assert the resource returns 200 and print the on-ledger txid.
 */
async function main(): Promise<void> {
  console.log("[spike] TODO: implement the pay-one-endpoint loop (W1–2)");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
