-- Fully Launched CRM — migration 002
-- Renames clients -> projects, reworks columns, adds roles/transactions/leads/contacts.
--
-- IMPORTANT: this is a one-time migration, not safe to re-run like schema.sql.
-- Run it exactly once, after schema.sql, against a database that still has the
-- original `clients` table with live data. Run in the Supabase SQL Editor.

-- ── clients -> projects ──────────────────────────────────────────────────
alter table clients rename to projects;
alter table projects rename column category to branch;

-- Note: the pre-existing category check constraint (whatever it's named)
-- keeps enforcing 'Media'/'Websites'/'Marketplace'/'AI' on the renamed
-- `branch` column automatically — Postgres check constraints track columns
-- by attnum, not name, and the allowed values aren't changing here, so
-- there's nothing to touch. (Not true for `stage` below, where the allowed
-- values ARE changing.)

-- cosmetic: keep the updated_at trigger's name in sync with the table name
alter trigger clients_set_updated_at on projects rename to projects_set_updated_at;

-- ── stage: add "Lost" + lost_reason ──────────────────────────────────────
-- Look up the existing stage check constraint by inspecting pg_constraint
-- instead of guessing its auto-generated name (e.g. `clients_stage_check`)
-- — a wrong guess would leave the old, more restrictive constraint in
-- place alongside the new one, silently blocking 'Lost' forever.
do $$
declare
  r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_attribute att
      on att.attrelid = rel.oid and att.attnum = any(con.conkey)
    where rel.relname = 'projects'
      and con.contype = 'c'
      and att.attname = 'stage'
  loop
    execute format('alter table projects drop constraint %I', r.conname);
  end loop;
end $$;

alter table projects
  add constraint projects_stage_check
  check (stage in ('Leads', 'Interested', 'Signed', 'In Progress', 'Complete', 'Subscriber', 'Lost'));

alter table projects add column if not exists lost_reason text;

-- ── remove step-tracking fields, add end_date ────────────────────────────
alter table projects
  drop column if exists next_step,
  drop column if exists next_step_owner,
  drop column if exists last_step,
  drop column if exists last_step_owner,
  drop column if exists last_step_date,
  add column if not exists end_date date;

-- ── salesperson (multi-select, same pattern as owner) ────────────────────
alter table projects add column if not exists salesperson uuid[] not null default '{}';

-- ── source: free text -> fixed single-select ─────────────────────────────
-- Null out any legacy free-text values that don't match the new fixed list,
-- rather than blocking the migration or silently failing the constraint add.
update projects
set source = null
where source is not null
  and source not in ('Cold Call', 'Email', 'LinkedIn', 'Instagram', 'Facebook', 'Website', 'Referral');

alter table projects
  add constraint projects_source_check
  check (source is null or source in ('Cold Call', 'Email', 'LinkedIn', 'Instagram', 'Facebook', 'Website', 'Referral'));

-- ── build / subscription toggles + their conditional fields ──────────────
alter table projects
  add column if not exists build boolean not null default false,
  add column if not exists build_value numeric,
  add column if not exists payment_status text,
  add column if not exists build_end_date date,
  add column if not exists subscription boolean not null default false,
  add column if not exists subscription_value numeric,
  add column if not exists deliver_date date,
  add column if not exists commission_rate numeric not null default 10;

alter table projects
  add constraint projects_payment_status_check
  check (payment_status is null or payment_status in ('Waiting for Deposit', 'Deposit Paid', 'Waiting for Payment', 'Paid'));

comment on column projects.commission_rate is
  'Percent (e.g. 10 = 10%). Applies to Build transactions. Subscription commission is undecided — not auto-calculated yet.';

-- ── project_tasks: rename client_id -> project_id to match ───────────────
alter table project_tasks rename column client_id to project_id;

-- ── team_members: add role ────────────────────────────────────────────────
alter table team_members add column if not exists role text;

update team_members set role = 'Admin' where email = 'luke@fullylaunched.com';
update team_members set role = 'Manager' where email in ('tait@fullylaunched.com', 'matteo@fullylaunched.com', 'elias@fullylaunched.com');
update team_members set role = 'Salesperson' where email = 'talon@fullylaunched.com';
-- safety net: any other/future team member caught mid-migration defaults to Manager
update team_members set role = 'Manager' where role is null;

alter table team_members
  add constraint team_members_role_check
  check (role in ('Admin', 'Manager', 'Salesperson'));
alter table team_members alter column role set not null;

-- ── transactions (Admin-only, see RLS below) ─────────────────────────────
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  amount numeric not null,
  date date not null default current_date,
  payer text,
  payee uuid references team_members(id),
  notes text,
  created_at timestamptz not null default now()
);

alter table transactions enable row level security;

-- Intentionally NOT "authenticated full access" like the other tables —
-- only team_members with role = 'Admin' may read or write transactions,
-- enforced here so direct API access is blocked even though the tab is
-- also hidden client-side for non-Admins.
drop policy if exists "authenticated full access" on transactions;
drop policy if exists "admin only access" on transactions;
create policy "admin only access" on transactions
  for all
  to authenticated
  using (
    exists (
      select 1 from team_members tm
      where tm.email = auth.jwt() ->> 'email'
        and tm.role = 'Admin'
    )
  )
  with check (
    exists (
      select 1 from team_members tm
      where tm.email = auth.jwt() ->> 'email'
        and tm.role = 'Admin'
    )
  );

-- ── leads (placeholder for Matteo's AI Lead Finder) ──────────────────────
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source text,
  contact_info text,
  notes text,
  created_at timestamptz not null default now()
);

alter table leads enable row level security;

drop policy if exists "authenticated full access" on leads;
create policy "authenticated full access" on leads
  for all
  to authenticated
  using (true)
  with check (true);

-- ── contacts (decoupled from projects — survives project deletion) ───────
-- One contact row per project engagement (not deduplicated by email across
-- multiple projects for the same person — acceptable simplification for now).
-- Auto-synced from projects via trigger below; project_id goes null (and the
-- last-known stage/details freeze in place) if the project is later deleted.
create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid unique references projects(id) on delete set null,
  name text,
  email text,
  phone text,
  company text,
  stage text,
  created_at timestamptz not null default now()
);

alter table contacts enable row level security;

drop policy if exists "authenticated full access" on contacts;
create policy "authenticated full access" on contacts
  for all
  to authenticated
  using (true)
  with check (true);

create or replace function sync_contact_from_project()
returns trigger as $$
begin
  insert into contacts (project_id, name, email, phone, company, stage)
  values (new.id, new.contact_name, new.email, new.phone, new.client_name, new.stage)
  on conflict (project_id) do update
    set name = excluded.name,
        email = excluded.email,
        phone = excluded.phone,
        company = excluded.company,
        stage = excluded.stage;
  return new;
end;
$$ language plpgsql;

drop trigger if exists projects_sync_contact on projects;
create trigger projects_sync_contact
  after insert or update of contact_name, email, phone, client_name, stage
  on projects
  for each row
  -- skip syncing blank placeholder rows (e.g. a freshly created "+ New Project")
  -- until a contact name is actually filled in
  when (new.contact_name is not null and new.contact_name <> '')
  execute function sync_contact_from_project();

-- backfill contacts for any projects that already have a contact name
insert into contacts (project_id, name, email, phone, company, stage)
select id, contact_name, email, phone, client_name, stage
from projects
where contact_name is not null and contact_name <> ''
on conflict (project_id) do update
  set name = excluded.name,
      email = excluded.email,
      phone = excluded.phone,
      company = excluded.company,
      stage = excluded.stage;
