# Fully Launched CRM — Build Guide

Clean-slate build. Same architecture pattern as a prior internal CRM (InnoHub CRM), different business, different data. **Do not reuse or reference any credentials, repo, or database from that or any other project.**

## Stack

- Next.js 14, App Router, TypeScript, Tailwind
- Supabase (Postgres + auth)
- Vercel (hosting)
- GitHub (source control)

## Branding

Brand colors are TBD. Build with placeholder neutral styling (white background, dark neutral header, single accent color), structured so the palette swaps in from one place — CSS variables or a single theme config file, never hardcoded in components.

Category badge colors are fixed regardless of brand palette (functional, not brand):
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
- RLS enabled on `clients`: any authenticated user can select/insert/update/delete (internal tool, no per-role restrictions yet)

### Team roster

NOT a fixed list — grows over time. Owner / Next Step Owner / Last Step Owner pull from an editable, growable roster: a `team_members` table (preferred) with a "+ Add Team Member" UI, not a hardcoded array in the UI or schema.

Seed initial roster (email pattern: firstname@fullylaunched.com):
- Luke — luke@fullylaunched.com
- Tait — tait@fullylaunched.com
- Elias — elias@fullylaunched.com
- Matteo — matteo@fullylaunched.com
- Talon (sales) — talon@fullylaunched.com

Create Supabase login accounts (Add User, manual) for all five before considering the app handoff-ready.

## Domain

Root domain `fullylaunched.com` is live and in use — **do not touch its DNS.** CRM lives on a subdomain (`app.fullylaunched.com` or `crm.fullylaunched.com`), added as the final deployment step: add domain in Vercel → get CNAME → add via whoever manages the domain's DNS.

## Data model

Single entity: **Clients**. No separate Projects/Mentors/Ventures split — one pipeline with a category tag.

| Field | Type / Notes |
|---|---|
| Client/Company Name | text |
| Category | single-select: Media / Websites / Marketplace / AI, color-coded badge |
| Contact Name | text |
| Email | text |
| Phone | text |
| Stage | single-select, in order: Leads → Interested → Signed → In Progress → Complete → Subscriber, color-coded badge |
| Owner | multi-select from team_members |
| Source | text (e.g. "Matteo AI Lead Finder", "Referral", "Cold Outreach") — free text for now |
| Value / Price | $ |
| Next Step | text |
| Next Step Owner | multi-select from team_members |
| Target Date | date |
| Last Step | text |
| Last Step Owner | multi-select from team_members |
| Last Step Date | date |
| Scheduled Call | datetime (populated by Cal.com integration) |
| Notes | text |
| stripe_customer_id | text |
| stripe_subscription_id | text |
| subscription_status | text (active/past_due/canceled) |

**Overdue logic:** if Target Date is past and Stage is not Complete/Subscriber, render the date cell red (text + light red background).

## Navigation

Post-login lands on `/dashboard` directly. Top banner: persistent tabs (not a dropdown) — Dashboard, All, Media, Websites, Marketplace, AI. Category tabs filter the client list view. Tab bar stays visible across all pages.

## Views

Reached via category tabs:

1. **Table view** — inline-editable cells, dropdowns for enum fields (Category, Stage, Owner, Next Step Owner, Last Step Owner), date pickers, sortable/filterable per column (click header to sort, filter icon for enum checkboxes or text search), filters combine with AND.

2. **Kanban view** — one column per Stage, drag-and-drop updates Stage immediately (`@dnd-kit/core`). Cards show: Client Name (bold), Category badge, Owner pill(s), Value, Target Date (red if overdue), truncated Next Step. Click → detail side-panel, all fields editable via shared cell components reused from table view.

"+ New Card" / "+ New Row" in both views creates a blank client and opens the detail panel immediately.

## Dashboard (`/dashboard`)

- Clients by Stage — bar/funnel chart
- Clients by Category — pie/bar, same 4 category colors
- Total pipeline Value, broken out by Stage
- Overdue count
- Upcoming scheduled calls (next 7 days)
- Recently added leads (last 5–10, by created_at)

Use `recharts`. White background, clean cards, category colors consistent with the rest of the app.

## Cal.com integration

Cal.com over Calendly — easier API/embed. **No team/paid tier needed** — work around the paid-team gate with individual free accounts:

- Each team member creates their own free individual Cal.com account
- `team_members` gets a `booking_link` field (one URL per person)
- Client detail panel shows the booking link for whoever is the assigned Owner on that client
- Each person's account can have its own webhook (`booking.created`) → same app endpoint → match to client by booker's email → update Scheduled Call
- Scales with headcount at no per-seat cost

If email matching proves unreliable at first: fall back to manually pasting date/time into Scheduled Call, treat webhook auto-sync as phase 2. Don't block the rest of the build on this.

## Stripe integration

- `stripe_customer_id` links client → Stripe Customer
- Client detail panel: "Create Invoice" action, one-off invoice tied to the Value field (no line-item editor yet)
- Subscriber-stage clients: support Stripe Subscriptions, store `stripe_subscription_id`, surface `subscription_status`
- Webhook (`invoice.paid`, `customer.subscription.updated`, etc.) keeps status in sync
- API keys server-side only, from env vars, never hardcoded

## Project tracker (per client)

Separate from Next Step / Last Step (those track pipeline movement; this tracks delivery once In Progress).

- `project_tasks` table: task name, assigned owner (from roster), due date, status (Not Started / In Progress / Done), notes
- Checklist/timeline inside the client detail panel; overdue tasks get the same red-highlight treatment
- Scoped per-client, not a top-level page, for now

## Matteo's AI Lead Finder

Placeholder only. `source` text field exists for manual tagging now; no live integration yet.

## Build order

1. Supabase: new project (new org "Fully Launched," separate from any other business's org) → `clients` table, `team_members` table, `project_tasks` table, RLS enabled requiring auth for all access
2. Next.js scaffold → connect Supabase → full auth wiring → theme config in place per Branding section
3. Manually create Supabase login accounts for the 5-person roster → test login end-to-end with at least 2 accounts before building further. **Double-check `NEXT_PUBLIC_SUPABASE_URL` is the bare project URL with no trailing path** — a stray path segment here caused a debugging detour last time.
4. Post-login redirect to `/dashboard`, top banner tabs wired
5. Table view — inline editing, dropdowns, overdue logic
6. Kanban view — drag-and-drop, detail panel, category filter tabs
7. Project tracker inside detail panel
8. "+ Add Team Member" UI
9. Seed real client data — **ask Luke for his existing client list/spreadsheet before writing a seed script; do not invent sample data**
10. Dashboard page + widgets
11. Cal.com booking embed + webhook (or manual field entry as interim)
12. Stripe integration
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
