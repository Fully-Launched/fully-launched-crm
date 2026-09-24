import "server-only";
import Stripe from "stripe";

// Server-only Stripe client. Created lazily so a missing key fails the
// request that needs it, not the build.
let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    client = new Stripe(key);
  }
  return client;
}

// Dashboard base URL for linking to an invoice — test-mode objects live
// under /test. Returns null when Stripe isn't configured.
export function stripeDashboardBase(): string | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return key.startsWith("sk_test_") || key.startsWith("rk_test_")
    ? "https://dashboard.stripe.com/test"
    : "https://dashboard.stripe.com";
}
