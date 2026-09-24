-- Fully Launched CRM — migration 010
-- Stripe invoicing, Piece 1 (Deposit / Build invoices).
--
-- deposit_percent: deposit = build_value * deposit_percent / 100. Per-project,
--   default 50, so it can change without a code change or migration.
-- stripe_deposit_invoice_id / stripe_build_invoice_id: the Stripe Invoice
--   sent for each. Blocks sending the same invoice twice, and lets the
--   webhook check a paid invoice against the one this app sent.
--
-- Run once, after 009, in the Supabase SQL Editor. Existing rows get
-- deposit_percent = 50 and null invoice ids; nothing else is touched.

alter table projects
  add column if not exists deposit_percent numeric not null default 50
    check (deposit_percent > 0 and deposit_percent <= 100),
  add column if not exists stripe_deposit_invoice_id text,
  add column if not exists stripe_build_invoice_id text;
