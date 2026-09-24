import type { Role } from "@/lib/theme";
import type { Project } from "@/lib/types";

// Shared by the Build section UI and the invoice route, so the amount shown
// in the confirm dialog is exactly the amount invoiced. All math is in
// integer cents.

export type InvoiceKind = "deposit" | "build";

// Payment terms on every Deposit/Build invoice.
export const INVOICE_DAYS_UNTIL_DUE = 14;

// Same roles as project delete (migration 007). The invoice route enforces
// this server-side; the UI check only hides the buttons.
export function canSendInvoices(role: Role | null | undefined): boolean {
  return role === "Admin" || role === "Manager";
}

export function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}

type AmountFields = Pick<Project, "build_value" | "deposit_percent">;

export function depositCents(p: AmountFields): number {
  return Math.round((toCents(p.build_value ?? 0) * p.deposit_percent) / 100);
}

// The Build invoice is the balance after the deposit, not the full
// build_value — the deposit was already invoiced.
export function buildBalanceCents(p: AmountFields): number {
  return toCents(p.build_value ?? 0) - depositCents(p);
}

export function invoiceCents(p: AmountFields, kind: InvoiceKind): number {
  return kind === "deposit" ? depositCents(p) : buildBalanceCents(p);
}

export function invoiceIdField(
  kind: InvoiceKind
): "stripe_deposit_invoice_id" | "stripe_build_invoice_id" {
  return kind === "deposit"
    ? "stripe_deposit_invoice_id"
    : "stripe_build_invoice_id";
}

// payment_status after sending, and after the webhook sees it paid.
export const STATUS_AFTER_SEND = {
  deposit: "Waiting for Deposit",
  build: "Waiting for Payment",
} as const;

export const STATUS_AFTER_PAID = {
  deposit: "Deposit Paid",
  build: "Paid",
} as const;
