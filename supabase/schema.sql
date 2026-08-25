-- Fully Launched CRM — initial schema
-- Run this once in the Supabase dashboard SQL Editor (Project → SQL Editor → New query).
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE where possible.

-- ── team_members ─────────────────────────────────────────────────────────
-- Growable roster. Owner / Next Step Owner / Last Step Owner on clients
-- reference rows here (never hardcode names in the app).
create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  booking_link text,
  created_at timestamptz not null default now()
);

alter table team_members enable row level security;

drop policy if exists "authenticated full access" on team_members;
create policy "authenticated full access" on team_members
  for all
  to authenticated
  using (true)
  with check (true);

-- ── clients ──────────────────────────────────────────────────────────────
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),

  client_name text not null,
  category text check (category in ('Media', 'Websites', 'Marketplace', 'AI')),

  contact_name text,
  email text,
  phone text,

  stage text not null default 'Leads'
    check (stage in ('Leads', 'Interested', 'Signed', 'In Progress', 'Complete', 'Subscriber')),

  -- multi-select fields: arrays of team_members.id
  owner uuid[] not null default '{}',
  next_step_owner uuid[] not null default '{}',
  last_step_owner uuid[] not null default '{}',

  source text,
  value numeric,

  next_step text,
  target_date date,

  last_step text,
  last_step_date date,

  scheduled_call timestamptz,
  notes text,

  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table clients enable row level security;

drop policy if exists "authenticated full access" on clients;
create policy "authenticated full access" on clients
  for all
  to authenticated
  using (true)
  with check (true);

-- keep updated_at current on every edit
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists clients_set_updated_at on clients;
create trigger clients_set_updated_at
  before update on clients
  for each row
  execute function set_updated_at();

-- ── project_tasks ────────────────────────────────────────────────────────
-- Per-client delivery checklist, scoped to a client (not a top-level page).
create table if not exists project_tasks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,

  task_name text not null,
  owner uuid references team_members(id),
  due_date date,
  status text not null default 'Not Started'
    check (status in ('Not Started', 'In Progress', 'Done')),
  notes text,

  created_at timestamptz not null default now()
);

alter table project_tasks enable row level security;

drop policy if exists "authenticated full access" on project_tasks;
create policy "authenticated full access" on project_tasks
  for all
  to authenticated
  using (true)
  with check (true);

-- ── seed team roster ─────────────────────────────────────────────────────
insert into team_members (name, email)
values
  ('Luke', 'luke@fullylaunched.com'),
  ('Tait', 'tait@fullylaunched.com'),
  ('Elias', 'elias@fullylaunched.com'),
  ('Matteo', 'matteo@fullylaunched.com'),
  ('Talon', 'talon@fullylaunched.com')
on conflict (email) do nothing;
