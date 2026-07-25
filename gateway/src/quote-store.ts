import type { PaymentRequirements } from "@payper/sdk";

/**
 * Server-side record of quotes the gateway has issued, keyed by invoiceId.
 *
 * Why it exists: on the paid retry the client echoes back the terms it signed.
 * A gateway must NOT trust those — it validates against the quote it originally
 * issued (canonical price/asset/payTo) and settles that. The store also enforces
 * expiry and single-use (idempotency) so a quote can't be replayed.
 *
 * In-memory is fine for the buildathon; swap for Redis behind the same interface
 * for multi-instance deployments.
 */
export interface QuoteStore {
  /** Record an issued quote. */
  put(invoiceId: string, req: PaymentRequirements): void;
  /** The stored quote, or undefined if unknown/expired. */
  get(invoiceId: string): PaymentRequirements | undefined;
  /** Mark a quote settled so it cannot be reused. */
  consume(invoiceId: string): void;
}

export class InMemoryQuoteStore implements QuoteStore {
  private readonly quotes = new Map<
    string,
    { req: PaymentRequirements; expiresAt: number }
  >();

  put(invoiceId: string, req: PaymentRequirements): void {
    this.quotes.set(invoiceId, {
      req,
      expiresAt: Date.now() + req.maxTimeoutSeconds * 1000,
    });
  }

  get(invoiceId: string): PaymentRequirements | undefined {
    const entry = this.quotes.get(invoiceId);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.quotes.delete(invoiceId);
      return undefined;
    }
    return entry.req;
  }

  consume(invoiceId: string): void {
    this.quotes.delete(invoiceId);
  }
}
