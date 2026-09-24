import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { STATUS_AFTER_PAID, invoiceIdField } from "@/lib/billing";
import { PAYMENT_STATUSES, type PaymentStatus } from "@/lib/theme";

// Stripe webhook. Excluded from the auth middleware (middleware.ts matcher),
// so the signature check below is the ONLY thing authenticating the caller —
// nothing is read or written before it passes.
//
// Handles:
// - invoice.paid: Deposit/Build invoice sent by this app -> payment_status
//   "Deposit Paid" / "Paid". Never moves the status backwards, so Stripe's
//   retries and out-of-order deliveries are harmless.
// - invoice.payment_failed: logged only, no automatic action (for now).

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isOurInvoice(
  invoice: Stripe.Invoice
): invoice is Stripe.Invoice & { metadata: { project_id: string; kind: "deposit" | "build" } } {
  const kind = invoice.metadata?.kind;
  return Boolean(invoice.metadata?.project_id) && (kind === "deposit" || kind === "build");
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // Invoices not created by the Build section (e.g. made by hand in the
  // Stripe dashboard) are ignored.
  if (!isOurInvoice(invoice)) return;
  const { project_id, kind } = invoice.metadata;
  const idField = invoiceIdField(kind);

  const supabase = createAdminClient();
  const { data: project, error } = await supabase
    .from("projects")
    .select(`id, payment_status, ${idField}`)
    .eq("id", project_id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!project) {
    console.warn("invoice.paid for a deleted project", invoice.id, project_id);
    return;
  }

  const row = project as Record<string, unknown> & {
    payment_status: PaymentStatus | null;
  };
  const storedId = row[idField] as string | null;
  if (storedId && storedId !== invoice.id) {
    console.warn(
      "invoice.paid doesn't match the project's stored invoice; ignoring",
      { invoice: invoice.id, stored: storedId, project_id, kind }
    );
    return;
  }

  const next = STATUS_AFTER_PAID[kind];
  const current = row.payment_status;
  const forward =
    !current ||
    PAYMENT_STATUSES.indexOf(next) > PAYMENT_STATUSES.indexOf(current);

  const patch: Record<string, string> = {};
  if (forward) patch.payment_status = next;
  // Covers an invoice that was sent but whose id failed to save.
  if (!storedId) patch[idField] = invoice.id;
  if (Object.keys(patch).length === 0) return;

  const { error: updateError } = await supabase
    .from("projects")
    .update(patch)
    .eq("id", project_id);
  // Throw -> 500 -> Stripe retries the event.
  if (updateError) throw new Error(updateError.message);
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return Response.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Missing signature" }, { status: 400 });
  }

  // Signature verification needs the raw, unparsed body.
  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch (e) {
    console.warn("Stripe webhook signature check failed", e);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "invoice.paid":
        await handleInvoicePaid(event.data.object);
        break;
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        console.error("Stripe invoice payment failed", {
          invoice: invoice.id,
          project_id: invoice.metadata?.project_id,
          kind: invoice.metadata?.kind,
          amount_due: invoice.amount_due,
        });
        break;
      }
      default:
        // Not subscribed to anything else; acknowledge so Stripe stops.
        break;
    }
  } catch (e) {
    console.error("Stripe webhook handler failed", event.type, event.id, e);
    return Response.json({ error: "Handler failed" }, { status: 500 });
  }

  return Response.json({ received: true });
}
