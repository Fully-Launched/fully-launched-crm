# Fully Launched CRM — Build Guide

Clean-slate build. Same architecture pattern as a prior internal CRM (InnoHub CRM), different business, different data. **Do not reuse or reference any credentials, repo, or database from that or any other project.**

## Stack

- Next.js 14, App Router, TypeScript, Tailwind
- Supabase (Postgres + auth)
- Vercel (hosting)
- GitHub (source control)

## Branding

Brand colors are TBD. Build with placeholder neutral styling (white background, dark neutral header, single accent color), structured so the palette swaps in from one place — CSS variables or a single theme config file, never hardcoded in components.

Branch badge colors are fixed regardless of brand palette (functional, not brand):
- Media — blue
- Websites — yellow
- Marketplace — red
- AI — green

## Access

Supabase email/password auth. No public signup. Accounts created manually via Supabase dashboard → Authentication → **Add User** (not "Invite User" — Invite User triggers an email flow that caused problems last time). Luke sets each person's initial password directly and sends it himself.

Auth wiring (mirror previous build exactly):
- `@supabase/supabase-js` + `@supabase/ssr`
- Browser/server Supabase clients + middleware session-refresh helper
- Middleware redirects unauthenticated users to `/login`
- `/login` page + server action → on success, redirect straight to `/dashboard` (no home page detour)
- RLS enabled on `projects`, `team_members`, `project_tasks`, `leads`, `contacts`: any authenticated user can select/insert/update/delete (internal tool, no per-role restrictions). **Exception: `transactions` is Admin-only at the RLS level** — see Roles & Transactions below.

### Team roster

NOT a fixed list — grows over time. Owner / Salesperson pull from an editable, growable roster: a `team_members` table (preferred) with a "+ Add Team Member" UI, not a hardcoded array in the UI or schema.

Each team member has a `role`: `Admin`, `Manager`, or `Salesperson`. Role gates access to the Transactions tab (Admin only) — see Roles & Transactions below. New team members must be given a role when added; there's no meaningful default.

Seed initial roster (email pattern: firstname@fullylaunched.com):
- Luke — luke@fullylaunched.com — Admin
- Tait — tait@fullylaunched.com — Manager
- Elias — elias@fullylaunched.com — Manager
- Matteo — matteo@fullylaunched.com — Manager
- Talon (sales) — talon@fullylaunched.com — Salesperson

Create Supabase login accounts (Add User, manual) for all five before considering the app handoff-ready.

## Domain

Root domain `fullylaunched.com` is live and in use — **do not touch its DNS.** CRM lives on a subdomain (`app.fullylaunched.com` or `crm.fullylaunched.com`), added as the final deployment step: add domain in Vercel → get CNAME → add via whoever manages the domain's DNS.

## Data model

**As of migration `002_projects_transactions_roles.sql`, this section supersedes the original single-`clients`-table design.** The rename was done as a proper `ALTER TABLE`/`ALTER COLUMN` migration (new file, `supabase/migrations/`), not a drop/recreate, since `clients` had live data by the time of the rewrite. `supabase/schema.sql` is left as-is (historical baseline); `supabase/migrations/002_...sql` is the source of truth for everything below.

Core entity: **Projects** (table `projects`, renamed from `clients`). One pipeline with a branch tag.

| Field | Type / Notes |
|---|---|
| client_name | text — the client/company this project is for (kept this name; not the same concept as a "project title") |
| branch | single-select: Media / Websites / Marketplace / AI (renamed from `category`), color-coded badge |
| contact_name | text |
| email | text |
| phone | text |
| stage | single-select, in order: Leads → Interested → Signed → In Progress → Complete → Subscriber → **Lost**, color-coded badge. Lost is reachable from any stage. |
| lost_reason | text, optional — shown only when stage = Lost |
| owner | multi-select from team_members |
| salesperson | multi-select from team_members — same pattern as owner |
| source | single-select (was free text): Cold Call / Email / LinkedIn / Instagram / Facebook / Website / Referral |
| value | $ |
| target_date | date |
| end_date | date — general project end date. Replaces the removed `next_step`/`next_step_owner`/`last_step`/`last_step_owner`/`last_step_date` fields (dropped in the migration) |
| build | boolean, default false |
| build_value | $ — full price of the build. Meaningful only when `build` is true |
| payment_status | single-select: Waiting for Deposit / Deposit Paid / Waiting for Payment / Paid. Meaningful only when `build` is true |
| build_end_date | date. Meaningful only when `build` is true |
| subscription | boolean, default false |
| subscription_value | $/mo. Meaningful only when `subscription` is true |
| deliver_date | date. Meaningful only when `subscription` is true |
| commission_rate | numeric percent, default 10. Applies to Build transactions; Subscription commission is undecided — field exists but nothing auto-calculates from it yet |
| scheduled_call | datetime (populated by Cal.com integration) |
| notes | text |
| stripe_customer_id | text |
| stripe_subscription_id | text |
| subscription_status | text (active/past_due/canceled) |

The `build`/`subscription` conditional fields (build_value, payment_status, build_end_date, subscription_value, deliver_date) and their invoice-action buttons live on the **Manage Project detail page**, not as Table view columns — "hidden entirely when false" only makes sense as a collapsing section on a single record, not as columns that vary per-row in a shared table. The `build`/`subscription` booleans themselves are still toggleable directly from the Table view.

**Overdue logic:** if Target Date is past and Stage is not Complete/Subscriber/Lost, render the date cell red (text + light red background). Same treatment for `project_tasks.due_date` when status ≠ Done.

### team_members

Adds a `role` column: `Admin` / `Manager` / `Salesperson`. See Roles & Transactions below.

### transactions

New table, **Admin-only** (RLS-enforced, not just hidden in the UI): `id`, `project_id` (fk → projects, nullable — survives project deletion), `amount`, `date`, `payer` (free text), `payee` (fk → team_members — who gets paid out), `notes`, `created_at`.

### leads

New table, placeholder for Matteo's AI Lead Finder: `id`, `name`, `source`, `contact_info`, `notes`, `created_at`. Visible/editable to all authenticated users (not role-gated).

### contacts

New table, decoupled from `projects` (per Luke's call — contacts must survive project deletion, so this is its own table rather than a filtered view). One row per project engagement, auto-synced from `projects` via an `AFTER INSERT OR UPDATE` trigger (`sync_contact_from_project`) whenever `contact_name`, `email`, `phone`, `client_name`, or `stage` changes on a project — skipped for blank/unnamed placeholder projects. `project_id` is nullable and goes to `null` (via `ON DELETE SET NULL`) if the source project is deleted, freezing `name`/`email`/`phone`/`company`/`stage` at their last synced values rather than losing the record. Not deduplicated by email across multiple projects for the same person — each project engagement gets its own contact row.

### project_tasks

Unchanged in shape from the original design, but its FK column was renamed `client_id` → `project_id` to match. See Manage Project below.

## Navigation

Post-login lands on `/dashboard` directly. Top banner: persistent tabs (not a dropdown) — Dashboard, All, Media, Websites, Marketplace, AI, Leads, Contacts, and Transactions (Admin only — hidden from the tab bar entirely for Manager/Salesperson). Branch tabs filter the project list view (routes are `/projects/[branch]`, renamed from `/clients/[category]`). Tab bar stays visible across all pages.

## Views

Reached via branch tabs:

1. **Table view** (built) — inline-editable cells, dropdowns for enum fields (Branch, Stage, Owner, Salesperson, Source), date pickers, sortable/filterable per column (click header to sort, filter icon for enum checkboxes or text search), filters combine with AND. Each row has a "Manage Project" button (→ dedicated detail page, not a side panel) and a Delete button (confirm dialog: "Delete this project? This can't be undone.").

2. **Kanban view** (not yet built) — one column per Stage, drag-and-drop updates Stage immediately (`@dnd-kit/core`). Cards show: client name (bold), Branch badge, Owner pill(s), Value, Target Date (red if overdue). Click → detail side-panel — likely superseded by the Manage Project page now that it exists; revisit whether Kanban still needs its own side-panel or should also deep-link to `/project/[id]`.

"+ New Project" in Table view creates a blank project row inline (no side panel yet — see Kanban note above).

## Dashboard (`/dashboard`)

Not yet built (still a placeholder page). When built:

- Projects by Stage — bar/funnel chart (include Lost)
- Projects by Branch — pie/bar, same 4 branch colors
- Total pipeline Value, broken out by Stage
- Overdue count
- Upcoming scheduled calls (next 7 days)
- Recently added leads (last 5–10, by created_at) — pull from the `leads` table now that it exists

Use `recharts`. White background, clean cards, branch colors consistent with the rest of the app.

## Cal.com integration

Cal.com over Calendly — easier API/embed. **No team/paid tier needed** — work around the paid-team gate with individual free accounts:

- Each team member creates their own free individual Cal.com account
- `team_members` gets a `booking_link` field (one URL per person) — already in schema
- Manage Project page shows the booking link for whoever is the assigned Owner on that project
- Each person's account can have its own webhook (`booking.created`) → same app endpoint → match to project by booker's email → update Scheduled Call
- Scales with headcount at no per-seat cost

If email matching proves unreliable at first: fall back to manually pasting date/time into Scheduled Call, treat webhook auto-sync as phase 2. Don't block the rest of the build on this.

## Stripe integration

Not yet wired up — the Manage Project page currently has placeholder "Invoice for Deposit"/"Invoice for Build" and "Send Monthly Invoice" buttons that show a plain notice instead of calling Stripe. Do NOT build Subscription auto-charge without a separate explicit decision.

- `stripe_customer_id` links project → Stripe Customer
- Manage Project page: "Invoice for Deposit" action while `payment_status` is Waiting for Deposit/unset, swaps to "Invoice for Build" once `payment_status` reaches Deposit Paid or later — tied to the Value/build_value field (no line-item editor yet)
- Subscription-toggled projects: support Stripe Subscriptions, store `stripe_subscription_id`, surface `subscription_status`; "Send Monthly Invoice" is manual-trigger only until Stripe is connected
- Webhook (`invoice.paid`, `customer.subscription.updated`, etc.) keeps status in sync
- API keys server-side only, from env vars, never hardcoded

## Roles & Transactions

`team_members.role` (`Admin` / `Manager` / `Salesperson`) exists specifically to gate the **Transactions** tab, enforced two places:

1. Frontend — tab hidden entirely from the nav for non-Admins; the `/transactions` page itself also redirects non-Admins to `/dashboard` server-side (belt-and-suspenders, not the real gate)
2. Backend — RLS policy on `transactions` restricts select/insert/update/delete to sessions whose `auth.jwt() ->> 'email'` matches a `team_members` row with `role = 'Admin'`. This is NOT the blanket "authenticated = full access" policy every other table uses — direct API access is blocked for non-Admins even if the frontend check were bypassed.

`commission_rate` lives on `projects` (not `transactions`) — applies to Build transactions; Subscription commission math is intentionally unimplemented.

## Manage Project (detail page, `/project/[id]`)

Dedicated page per project (not a side panel), reachable via the "Manage Project" button on each Table view row. Deliberately a separate top-level route (`/project/[id]`, singular) rather than nested under `/projects/[branch]/...` to avoid colliding with the branch-slug dynamic segment.

- All core project fields, editable via the same cell components as Table view
- Lost Reason field, shown only when Stage = Lost
- Build section: toggle + build_value + payment_status + build_end_date + invoice action (collapses away when Build is off)
- Subscription section: toggle + subscription_value + deliver_date + invoice action (collapses away when Subscription is off)
- Project Tasks: add/edit/assign-owner/due-date/status/mark-done on `project_tasks`, scoped to this project; overdue tasks get the same red-highlight treatment as Target Date

## Leads tab

Placeholder for Matteo's AI Lead Finder, now backed by a real `leads` table (see Data model) rather than just a `source` tag on projects. Each row has an "Add to Project" button that creates a new `projects` row (Stage defaults to Leads, source carried over if it matches the fixed list) and sends the salesperson to that project's Manage Project page to fill in the rest. No live AI Lead Finder integration yet — rows are added manually for now.

## Build order

Steps 1–5 below predate migration 002 and describe the original `clients` schema — see Data model for what actually exists now. Kept for history; don't re-run step 1's schema.sql expecting `clients` to still exist.

1. ~~Supabase: new project → `clients` table, `team_members` table, `project_tasks` table, RLS enabled requiring auth for all access~~ (done; superseded by migration 002 — see Data model)
2. ~~Next.js scaffold → connect Supabase → full auth wiring → theme config in place per Branding section~~ (done)
3. ~~Manually create Supabase login accounts for the 5-person roster → test login end-to-end~~ (done)
4. ~~Post-login redirect to `/dashboard`, top banner tabs wired~~ (done; nav since extended with Leads/Contacts/Transactions)
5. ~~Table view — inline editing, dropdowns, overdue logic~~ (done; reworked onto `projects` schema, see Data model)
6. Run migration `002_projects_transactions_roles.sql` in the Supabase SQL Editor (done in code, but **must be applied to the live database before any of steps 7+ will work**)
7. Kanban view — drag-and-drop, branch filter tabs (not started; see Views note on whether it still needs its own side panel now that Manage Project exists)
8. "+ Add Team Member" UI — needs a role picker (Admin/Manager/Salesperson) now, not just name/email
9. Seed real client data — **ask Luke for his existing client list/spreadsheet before writing a seed script; do not invent sample data**
10. Dashboard page + widgets
11. Cal.com booking embed + webhook (or manual field entry as interim)
12. Stripe integration — wire up the placeholder invoice buttons on Manage Project; Subscription auto-charge needs a separate explicit decision first
13. Push to new GitHub repo, deploy to new Vercel project, env vars set in Vercel dashboard (not committed)
14. Update Supabase redirect URLs to include the live Vercel URL
15. Connect subdomain once live and confirmed → update Supabase redirect URLs again
16. Confirm Vercel Deployment Protection is OFF (defaults on, requires a Vercel account to view the site otherwise — tripped up the last deployment)
17. Apply real brand colors once provided, via the single theme config from step 2

## Rules for whoever (Claude Code) picks this up

- Clean-slate build. No code, credentials, or DB connections imported from any other project.
- Confirm exact field list and stage names with Luke before seeding real data — this doc is the starting point, not final once real client data is in hand.
- Auth is required, not optional — don't skip login assuming it can wait.
- Team roster will grow — never hardcode names in UI or schema.
- Before starting, Luke needs: a new Supabase project + its URL/anon key, a new GitHub repo, and (later) a Vercel project connected to that repo. Claude Code can scaffold the GitHub repo; Vercel needs a one-time manual connection (~2 min) per project.
- Once there's live data, schema changes are migrations (new numbered file in `supabase/migrations/`, `ALTER TABLE`/`ALTER COLUMN`, never a hand-edit of `supabase/schema.sql` or a drop/recreate). Migration 002 is the first example of this pattern.
- `transactions` established the precedent for role-gated tables: default RLS is "authenticated = full access," but a table can instead check `team_members.role` via `auth.jwt() ->> 'email'` when there's an explicit access restriction. Don't apply role gates anywhere else unless asked — Leads/Contacts/etc. stay open to all authenticated users.
