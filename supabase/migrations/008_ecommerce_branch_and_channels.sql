-- Fully Launched CRM — migration 008
-- 1. Renames the Marketplace branch to Ecommerce (check constraint + rows).
-- 2. Adds projects.channels (text[]), a branch-specific list of
--    channels/platforms. One column for every branch; the UI decides how it's
--    edited based on branch (multi-select / single-select / free-text tags).
--    No DB-level check on its values — the option lists live in the app and
--    AI takes free text.
--
-- The branch check constraint is still named clients_category_check on the
-- live database (inherited through the clients->projects and
-- category->branch renames in migration 002). It's dropped by that name, and
-- the replacement gets the name matching the rest: projects_branch_check.
--
-- Run once, after 007, in the Supabase SQL Editor. Rewrites branch on every
-- 'Marketplace' row (4 on the live database as of 2026-09-23). Deploy the
-- matching app code right after: until then the live app still offers
-- 'Marketplace', which the new constraint rejects.

begin;

-- ── branch: Marketplace -> Ecommerce ─────────────────────────────────────
-- Drop the old check first: the UPDATE below would violate it.
alter table projects drop constraint if exists clients_category_check;
alter table projects drop constraint if exists projects_branch_check;

update projects set branch = 'Ecommerce' where branch = 'Marketplace';

-- NULL branch stays allowed, same as before.
alter table projects add constraint projects_branch_check
  check (branch in ('Media', 'Websites', 'Ecommerce', 'AI'));

-- ── channels ─────────────────────────────────────────────────────────────
alter table projects add column if not exists channels text[];

commit;
