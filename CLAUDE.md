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
- Nav tabs, in order: Dashboard / Leads / All / Media / Websites / Ecommerce / AI Integration / Transactions / Contacts / Team. Transactions and Team are Admin-only (hidden from nav, pages redirect non-Admins; RLS is the real gate). "AI Integration" is a nav-only label — the branch value, slug, and page heading stay "AI". Below `sm` the nav collapses to a hamburger dropdown (`components/TopNav.tsx`).

## Branding

- Brand palette lives in one theme config file (`lib/theme.ts`), single swap point — never hardcode colors in components
- Brand accent is navy `#1B2B4B` (`--color-accent` in `app/globals.css`, replaced `#2563eb`). Any navy use references that variable, not the hex.
- Branch badges are **solid fills**, fixed regardless of brand palette. Values live once in `BRANCH_FILL` (`lib/theme.ts`); `tailwind.config.ts` imports it as `branch-*` colors, and the dashboard chart uses it directly:
  - Media — gold `#B8962E`, **navy text** (`text-accent`; white on this gold is 2.82:1 and fails AA)
  - Websites — brand navy (`var(--color-accent)`)
  - Ecommerce — dark green `#1B4B3A`
  - AI — maroon `#7A1F2A`
  - White text on Websites/Ecommerce/AI.
- Stage badges are **pastel** (`STAGE_COLORS`: `-50` tint, `-700` text, `-200` border, all ≥ 4.5:1): Leads gray, Interested fuchsia, Signed indigo, In Progress amber, Complete green, Subscriber teal, Lost red. The stage *chart* keeps stronger `-500`-ish fills (`STAGE_CHART_COLORS`).
- `tailwind.config.ts` `content` must include `./lib/**` — all badge/pill class strings live in `lib/theme.ts`, and before this was added none of them were generated (badges rendered uncolored).
- Owner/Salesperson pill colors are per person (`memberColors()` in `lib/team.ts`, palettes in `lib/theme.ts`): `PINNED_MEMBER_COLORS` fixes a color by email; everyone else rotates through `MEMBER_COLOR_ROTATION` (purple, orange, emerald, pink, cyan, lime) in `team_members` (`created_at`, `id`) order, so new members get a color with no code change. Adding a member never changes existing colors; removing one shifts the colors of members added after them. Unknown ids render gray.
- **Deliberate exception to "never hardcode team member names":** Luke is pinned to blue by his email (`luke@fullylaunched.com`) in `PINNED_MEMBER_COLORS`. It's keyed on email, not name, so a rename doesn't break it; if his login email changes, update it there. If more per-person colors are wanted, move this to a `team_members.color` column instead of adding emails.

## Data model (confirmed live via Supabase, 2026-09-22)

Live tables: `projects`, `team_members`, `project_tasks`, `transactions`, `leads`, `contacts` — all RLS enabled. Migration 002 (clients→projects rename, category→branch, roles, Transactions/Leads/Contacts, Lost stage, Build/Subscription toggles) is **applied to the live database**. `projects` had 9 rows as of 2026-09-23 (empty as of 2026-09-22). `supabase/migrations/002_projects_transactions_roles.sql` is the source of truth for schema; `supabase/schema.sql` is the historical baseline.

- **Projects** (renamed from `clients`)
- **Branch** (renamed from `category`) — Media, Websites, Ecommerce, AI. Ecommerce was "Marketplace" until migration 008 (constraint + existing rows renamed; `/projects/marketplace` redirects to `/projects/ecommerce` via `next.config.mjs`). The check is now `projects_branch_check` — before 008 it was still named `clients_category_check`.
- **Stage** — Leads → Interested → Signed → In Progress → Complete → Subscriber → Lost. Subscriber is a real, live stage (in `projects_stage_check`); keep it.
- **Owner** — `uuid[]` array of team_member ids; already multi-value. (`project_tasks.owner` is a single `uuid` — intentional.)
- **Transactions** — Admin-only, RLS-gated
- **Leads**, **Contacts** — built
- **Dashboard** (`app/(app)/dashboard/page.tsx`, `components/dashboard/`, `lib/dashboard.ts`, `lib/theme.ts`) — built and committed.
- **Kanban** (`/projects/[branch]?view=kanban`, `components/kanban/`) — built: dnd-kit stage columns sorted by `updated_at` desc, + New Project. Detail page back link reads `?from=`/`?tab=` (`lib/projects.ts`).

### `projects` fields

| Field | Type / Notes |
|---|---|
| client_name | text — the client/company this project is for |
| branch | single-select: Media / Websites / Ecommerce / AI, color-coded badge. Changing branch clears `channels` (`branchChangePatch` in `lib/channels.ts`) |
| channels | `text[]`, nullable (migration 008) — branch-specific channels/platforms. One column for every branch; the input type is presentation only, driven by branch (options in `lib/channels.ts`, no DB check): **Ecommerce** multi-select Faire / Shopify / Etsy / TikTok Shop / Amazon / Walmart / eBay; **Media** multi-select TikTok / Instagram / LinkedIn / Facebook / YouTube / Pinterest; **Websites** single-select Custom / WordPress / Shopify / Squarespace / Wix (stored as a one-element array); **AI** free-text tags (Enter to add). Empty = null. Editable on Manage Project and as a Table column (`components/ChannelsField.tsx`); carried over by Duplicate |
| contact_name | text |
| email | text |
| phone | text |
| stage | single-select, in order: Leads → Interested → Signed → In Progress → Complete → Subscriber → Lost, color-coded badge. Lost is reachable from any stage. |
| lost_reason | text, optional — shown only when stage = Lost |
| owner | multi-select (`uuid[]`) from team_members |
| salesperson | multi-select (`uuid[]`) from team_members — same pattern as owner |
| source | single-select: Cold Call / Email / LinkedIn / Instagram / Facebook / Website / Referral / Relationship / Inbound (Relationship added in migration 004, Inbound in 009) |
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

- Role checks apply only to Transactions, team_members writes (migration 005), and project deletion (Admin or Manager, migration 007).
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

### Project delete (migrations 006, 007)

Deleting a project is limited to **Admin or Manager**, enforced by the `admin or manager delete` RLS policy on `projects` (`using (public.is_admin_or_manager())`, migration 007 — replaced 006's Admin-only `admin delete`). Select/insert/update on `projects` stay open to all authenticated users. Salespeople can't delete.

- The only Delete button is on the Manage Project page (`/project/[id]`); the Table view's per-row Delete was removed. Salespeople don't see the button (UI only — RLS is the real gate).
- What deleting a project does: `project_tasks` **cascade** (deleted with it); `transactions` and `contacts` survive with `project_id` set to null.
- An RLS-blocked delete returns no error, just zero rows — delete calls must use `.select()` and check the returned rows.
- On success the page redirects to the `?from=`/`?tab=` origin (`projectOrigin` in `lib/projects.ts`).

## Manage Project page

`/project/[id]` — Build and Subscription sections, project tasks, Delete (Admin/Manager). Live.

**Duplicate project** (any authenticated user): inserts `duplicateProjectPayload()` (`lib/projects.ts`) — same stage, "(Copy)" appended to `client_name`, no id/timestamps/`scheduled_call`/Stripe fields. Tasks and transactions aren't copied. On success it opens the copy's detail page, carrying over `?from=`/`?tab=` so the back link still returns to the original view.

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

- **Kanban**: `@dnd-kit/core` for drag between Stage columns. Sort cards within each column by `updated_at` descending from the first version — don't ship unsorted. Respect Branch tab filtering. Duplicate lives on the Manage Project page, not on cards (see Manage Project page section).
- **Detail page back button**: track origin view/tab via query param (`?from=table&tab=websites`), not `router.back()` alone — it breaks after client-side view-state changes.
- **Dropdowns inside scroll containers**: the Table view's `overflow-x-auto` wrapper also clips vertically (CSS forces the other axis to `auto`), so absolutely-positioned menus get cut off. Cell and filter dropdowns (`MultiSelectCell`, `BadgeSelectCell`, `ColumnHeader`) render through `components/table/Popover.tsx` — a portal to `document.body`, `position: fixed` from the trigger's rect, flips above when there's no room below. Use it for any new dropdown.
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

1. ~~"+ Add Team Member" screen (three-role picker)~~ — done, shipped in 247e927
2. Load real client data — get Luke's actual client list first, don't invent sample data (all tables are currently empty)
3. Cal.com integration
4. Stripe: connect invoice buttons
