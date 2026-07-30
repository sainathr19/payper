import { Client, type Wallet } from "xrpl";
import { payFor, type PayResult } from "@payper/agent/pay";

/**
 * Demo affordance behind the marketplace "Pay & call" button: the browser can't
 * sign XRPL payments, so the backend runs one reference x402 payment on the
 * visitor's behalf with a single shared, faucet-funded testnet wallet. The
 * settlement is real — it lands on-chain and flows back through the indexer.
 */

const TESTNET_WSS = process.env.XRPL_ENDPOINT ?? "wss://s.altnet.rippletest.net:51233";

let clientPromise: Promise<Client> | null = null;
let walletPromise: Promise<Wallet> | null = null;

async function getClient(): Promise<Client> {
  if (clientPromise) {
    const existing = await clientPromise;
    if (existing.isConnected()) return existing;
  }
  clientPromise = (async () => {
    const client = new Client(TESTNET_WSS);
    await client.connect();
    return client;
  })();
  return clientPromise;
}

async function getWallet(client: Client): Promise<Wallet> {
  if (!walletPromise) {
    walletPromise = (async () => {
      const { wallet } = await client.fundWallet();
      console.log(`[backend] marketplace pay wallet funded ${wallet.address}`);
      return wallet;
    })();
  }
  return walletPromise;
}

/** Run one settled pay-per-call request against `url` (a gateway endpoint). */
export async function payService(url: string): Promise<PayResult> {
  const client = await getClient();
  const wallet = await getWallet(client);
  return payFor(url, client, wallet);
}
