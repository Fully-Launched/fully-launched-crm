# Fully Launched CRM — CLAUDE.md

## Stack & infra

- Next.js 14 (App Router, TypeScript, Tailwind)
- Supabase project `okvjdpqnqyrzpbaneivu` — **intentionally shared** with FL-social-dash, separated by table prefix (FL-social-dash owns the `social_*` tables; never touch those from this repo). This supersedes the original spec's "dedicated Supabase project" requirement.
- Vercel project `fl-crm` (a duplicate empty project named `fully-launched-crm` exists and should stay deleted/unused)
- GitHub: `Fully-Launched/fully-launched-crm`, local path `~/Desktop/Files/Dev/FL/fully-launched-crm`, alias `launch`
- Keep-alive cron is live: `app/api/keep-alive/route.ts` + `vercel.json`, pings Supabase every 3 days to prevent free-tier auto-pause. Don't duplicate this.

## Auth & nav

- Email/password only, no signup page
- Accounts are created manually in Supabase dashboard → Authentication → **Add User** (not "Invite User" — Invite User triggers an email flow that caused problems last time). Luke sets each person's initial password directly and sends it himself.
- Unauthenticated → redirect to `/login`; authenticated → land on `/dashboard`
- Nav tabs: Dashboard / All / Media / Websites / Marketplace / AI / Leads / Contacts / Transactions (Transactions is Admin-only, RLS-enforced not just UI-hidden)

## Branding

- Brand palette lives in one theme config file (`lib/theme.ts`), single swap point — never hardcode colors in components
- Branch badge colors are fixed regardless of brand palette (functional, not brand):
  - Media — blue
  - Websites — yellow
  - Marketplace — red
  - AI — green

## Data model (confirmed live via Supabase, 2026-09-22)

Live tables: `projects`, `team_members`, `project_tasks`, `transactions`, `leads`, `contacts` — all RLS enabled. Migration 002 (clients→projects rename, category→branch, roles, Transactions/Leads/Contacts, Lost stage, Build/Subscription toggles) is **applied to the live database**. All tables currently show 0 rows — no real client data loaded yet (see punch list). `supabase/migrations/002_projects_transactions_roles.sql` is the source of truth for schema; `supabase/schema.sql` is the historical baseline.

- **Projects** (renamed from `clients`)
- **Branch** (renamed from `category`) — Media, Websites, Marketplace, AI
- **Stage** — Leads → Interested → Signed → In Progress → Complete → Subscriber → Lost. Subscriber is a real, live stage (in `projects_stage_check`); keep it.
- **Owner** — `uuid[]` array of team_member ids; already multi-value. (`project_tasks.owner` is a single `uuid` — intentional.)
- **Transactions** — Admin-only, RLS-gated
- **Leads**, **Contacts** — built
- **Dashboard** (`app/(app)/dashboard/page.tsx`, `components/dashboard/`, `lib/dashboard.ts`, `lib/theme.ts`) — built and committed.
- **Kanban** (`/projects/[branch]?view=kanban`, `components/kanban/`) — built: dnd-kit stage columns sorted by `updated_at` desc, Duplicate, + New Project. Detail page back link reads `?from=`/`?tab=` (`lib/projects.ts`).

### `projects` fields

| Field | Type / Notes |
|---|---|
| client_name | text — the client/company this project is for |
| branch | single-select: Media / Websites / Marketplace / AI, color-coded badge |
| contact_name | text |
| email | text |
| phone | text |
| stage | single-select, in order: Leads → Interested → Signed → In Progress → Complete → Subscriber → Lost, color-coded badge. Lost is reachable from any stage. |
| lost_reason | text, optional — shown only when stage = Lost |
| owner | multi-select (`uuid[]`) from team_members |
| salesperson | multi-select (`uuid[]`) from team_members — same pattern as owner |
| source | single-select: Cold Call / Email / LinkedIn / Instagram / Facebook / Website / Referral / Relationship (added in migration 004) |
| value | $ |
| target_date | date |
| end_date | date — general project end date (replaces dropped next_step/last_step fields) |
| build | boolean, default false |
| build_value | $ — full price of the build. Meaningful only when `build` is true |
| payment_status | single-select: Waiting for Deposit / Deposit Paid / Waiting for Payment / Paid. Meaningful only when `build` is true |
| build_end_date | date. Meaningful only when `build` is true |
| subscription | boolean, default false |
| subscription_value | $/mo. Meaningful only when `subscription` is true |
| deliver_date | date. Meaningful only when `subscription` is true |
| commission_rate | numeric percent, default 10. Applies to Build transactions; Subscription commission is undecided — nothing auto-calculates from it yet |
| scheduled_call | datetime (populated by Cal.com integration) |
| notes | text |
| stripe_customer_id | text |
| stripe_subscription_id | text |
| subscription_status | text (active/past_due/canceled) |

The `build`/`subscription` conditional fields live on the Manage Project page as collapsing sections, not as Table view columns. The `build`/`subscription` booleans themselves are toggleable from the Table view.

### `transactions` fields

| Field | Type / Notes |
|---|---|
| id | uuid, primary key |
| project_id | uuid, nullable, fk → projects — `ON DELETE SET NULL` (migration 003), so transactions survive project deletion, same pattern as `contacts.project_id` |
| amount | numeric, not null |
| date | date, not null, default today |
| payer | text (free text) |
| payee | uuid, fk → team_members — who gets paid out |
| notes | text |
| created_at | timestamptz, default now() |

### `leads` fields

| Field | Type / Notes |
|---|---|
| id | uuid, primary key |
| name | text, not null |
| source | text |
| contact_info | text |
| notes | text |
| created_at | timestamptz, default now() |

Visible/editable to all authenticated users (not role-gated).

### `contacts` sync

`contacts` is its own table (not a filtered view of `projects`) so contacts survive project deletion. One row per project engagement, auto-synced by the `AFTER INSERT OR UPDATE` trigger `projects_sync_contact` → `sync_contact_from_project()` whenever `contact_name`, `email`, `phone`, `client_name`, or `stage` changes. Skipped for blank placeholder projects (no `contact_name`). `project_id` is `unique` and `ON DELETE SET NULL`, so when a project is deleted its contact row stays with `name`/`email`/`phone`/`company`/`stage` frozen at the last synced values. Not deduplicated by email across projects.

## Roles

Three-tier: Admin / Manager / Salesperson.

- Role checks apply only to Transactions, team_members writes (migration 005), and project deletion (migration 006).
- Never hardcode team member names — roster is data-driven.
- Salesperson role-gating (e.g. Talon: no Transactions access) is implemented via RLS but **not verified end-to-end**. Deferred to a dedicated pass, not bundled into unrelated feature work.
- "+ Add Team Member" UI: role selector across the three roles, roster editable via the app, not hardcoded. New members must be given a role when added; there's no meaningful default.

### Seed roster

Initial team (email pattern `firstname@fullylaunched.com`). This is the starting roster, not a fixed list — it lives in `team_members` and grows via the app.

| Name | Email | Role |
|---|---|---|
| Luke | luke@fullylaunched.com | Admin |
| Tait | tait@fullylaunched.com | Manager |
| Elias | elias@fullylaunched.com | Manager |
| Matteo | matteo@fullylaunched.com | Manager |
| Talon (sales) | talon@fullylaunched.com | Salesperson |

Each needs a Supabase login account (Add User, manual) before the app is handoff-ready.

### Transactions RLS

Unlike most tables (blanket "authenticated = full access"), `transactions` select/insert/update/delete is restricted by the `admin only access` policy to sessions where `auth.jwt() ->> 'email'` matches a `team_members.email` row with `role = 'Admin'`. Direct API access is blocked for non-Admins even if the frontend check is bypassed. Frontend also hides the tab and `/transactions` redirects non-Admins to `/dashboard` server-side (belt-and-suspenders, not the real gate).

### Project delete (migration 006)

Deleting a project is **Admin-only**, enforced by the `admin delete` RLS policy on `projects` (`using (public.is_admin())`). Select/insert/update on `projects` stay open to all authenticated users. Migration 006 is applied to the live database.

- The only Delete button is on the Manage Project page (`/project/[id]`); the Table view's per-row Delete was removed. Non-Admins don't see the button (UI only — RLS is the real gate).
- What deleting a project does: `project_tasks` **cascade** (deleted with it); `transactions` and `contacts` survive with `project_id` set to null.
- An RLS-blocked delete returns no error, just zero rows — delete calls must use `.select()` and check the returned rows.
- On success the page redirects to the `?from=`/`?tab=` origin (`projectOrigin` in `lib/projects.ts`).

## Manage Project page

`/project/[id]` — Build and Subscription sections, project tasks, Admin-only Delete. Live.

## Leads tab

Placeholder for Matteo's AI Lead Finder, backed by the `leads` table. Each row has an **"Add to Project"** button that creates a new `projects` row (Stage defaults to Leads, `source` carried over if it matches the fixed source list) and sends the user to that project's Manage Project page to fill in the rest. No live AI Lead Finder integration yet — rows are added manually.

## Overdue logic

If Target Date is in the past and Stage is **not** Complete, Subscriber, or Lost → red text + light red background. Same treatment for `project_tasks.due_date` when status ≠ Done.

## Rules

- Schema changes go in new numbered migration files — never edit `schema.sql` directly
- Don't touch DNS for the root domain `fullylaunched.com`
- Brand palette lives in one theme config file (`lib/theme.ts`), single swap point
- Never hardcode team member names
- This repo shares its Supabase project with FL-social-dash by design — never touch `social_*` tables

## Build patterns to apply going forward

(From a prior CRM build's lessons — apply proactively, not as after-the-fact fixes.)

- **Kanban**: `@dnd-kit/core` for drag between Stage columns. Sort cards within each column by `updated_at` descending from the first version — don't ship unsorted. Respect Branch tab filtering. Add a Duplicate button on cards, copies the project into the same stage with "(Copy)" appended to the name.
- **Detail page back button**: track origin view/tab via query param (`?from=table&tab=websites`), not `router.back()` alone — it breaks after client-side view-state changes.
- **Table view resizable columns**: scope `overflow-hidden` truncation to text/select/date cells only — applying it to multi-select cells (Branch, Owner) clips the checkbox popover.
- **Multi-value fields**: array columns from day one, not retrofitted.
- Favicon changes are aggressively cached — test in incognito.
- Vercel Deployment Protection stays off (Settings → Deployment Protection → Disabled).
- Batch schema + UI + data changes into small testable phases, not one large multi-part change.

## Domain

**Live:** `crm.fullylaunched.com` via CNAME, verified on Vercel. No paid Vercel Team needed for a custom domain (that's only for removing the personal-account slug from the default `*.vercel.app` URL).

## Cal.com plan

Cal.com over Calendly. No team/paid tier — work around the paid-team gate with individual free accounts:

- Each team member creates their own free individual Cal.com account
- `team_members.booking_link` (text, already in schema) holds one booking URL per person
- Manage Project page shows the booking link for the project's assigned Owner
- Each person's account gets its own `booking.created` webhook → same app endpoint → match to project by booker's email → update `scheduled_call`
- Scales with headcount at no per-seat cost
- If email matching proves unreliable, fall back to manually entering Scheduled Call; treat webhook auto-sync as phase 2

## Stripe plan

Not wired up yet. API keys server-side only, from env vars, never hardcoded.

- **Built:** placeholder buttons on the Manage Project page — "Invoice for Deposit" / "Invoice for Build" (Build section) and "Send Monthly Invoice" (Subscription section). They currently show a plain notice instead of calling Stripe.
- **Deposit → Build swap:** "Invoice for Deposit" shows while `payment_status` is Waiting for Deposit or unset; it swaps to "Invoice for Build" once `payment_status` reaches Deposit Paid or later. Amount is tied to `value`/`build_value` (no line-item editor yet).
- **Customer link:** `stripe_customer_id` links project → Stripe Customer.
- **Subscriptions:** Subscription-toggled projects use Stripe Subscriptions, store `stripe_subscription_id`, surface `subscription_status`. "Send Monthly Invoice" is manual-trigger only.
- **Webhooks:** `invoice.paid`, `customer.subscription.updated`, etc. → app endpoint keeps `payment_status`/`subscription_status` in sync.
- **Deferred:** Subscription auto-charge — do NOT build without a separate explicit decision.

## Deferred / explicitly out of scope

- Salesperson role-gating end-to-end verification
- Cal.com booking embed + webhook (plan above)
- Stripe: invoice buttons first; automatic subscription charging needs a separate decision before building (plan above)
- Customer-facing portal (separate client auth) — own future project, not started
- AI-generated proposals/SoWs, LinkedIn OAuth, notifications — no defined format/scope yet

## Current punch list (priority order)

1. "+ Add Team Member" screen (three-role picker)
2. Load real client data — get Luke's actual client list first, don't invent sample data (all tables are currently empty)
3. Table view overflow-hidden audit on multi-select columns
4. Cal.com integration
5. Stripe: connect invoice buttons
