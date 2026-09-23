-- Fully Launched CRM — migration 005
-- Locks down writes on team_members to Admins, and guarantees at least one
-- Admin always remains.
--
-- Why: team_members previously had the blanket "authenticated full access"
-- policy, so any signed-in user could UPDATE their own row to role = 'Admin'
-- via the Supabase API and thereby pass the Admin-only RLS on transactions.
-- The transactions gate is only as strong as the policy guarding
-- team_members.role.
--
-- Run once, after 004, in the Supabase SQL Editor. No data is touched.

begin;

-- ── is_admin() ───────────────────────────────────────────────────────────
-- Same check the transactions policy uses (auth.jwt() ->> 'email' matched
-- against a team_members row with role = 'Admin'), wrapped in a function.
-- It has to be SECURITY DEFINER: a team_members policy that queries
-- team_members directly would recurse into its own RLS and error out.
-- Pinned search_path so the definer-rights function can't be hijacked.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members tm
    where tm.email = auth.jwt() ->> 'email'
      and tm.role = 'Admin'
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ── team_members policies ────────────────────────────────────────────────
-- Reads stay open to every authenticated user (Owner/Salesperson pickers,
-- getCurrentTeamMember(), the transactions policy's own lookup).
-- Insert/update/delete are Admin-only.
drop policy if exists "authenticated full access" on team_members;
drop policy if exists "authenticated read" on team_members;
drop policy if exists "admin insert" on team_members;
drop policy if exists "admin update" on team_members;
drop policy if exists "admin delete" on team_members;

create policy "authenticated read" on team_members
  for select
  to authenticated
  using (true);

create policy "admin insert" on team_members
  for insert
  to authenticated
  with check (public.is_admin());

create policy "admin update" on team_members
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin delete" on team_members
  for delete
  to authenticated
  using (public.is_admin());

-- ── last-Admin guard ─────────────────────────────────────────────────────
-- Blocks any UPDATE or DELETE that leaves zero Admins, however the write is
-- made (app, API, SQL Editor). Statement-level AFTER triggers so a single
-- multi-row statement demoting every Admin at once is caught too (a
-- BEFORE ROW check can't see other rows changed by the same statement).
-- Only fires when the statement actually touched an Admin row.
--
-- The advisory lock serializes concurrent demotions: without it, two
-- transactions each demoting a different one of two Admins could both see
-- the other Admin still present and both commit.
create or replace function public.ensure_an_admin_remains()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from old_rows where role = 'Admin') then
    return null;
  end if;

  perform pg_advisory_xact_lock(hashtext('public.team_members.admin_guard'));

  if not exists (select 1 from public.team_members where role = 'Admin') then
    raise exception 'At least one Admin must remain on the team'
      using errcode = 'check_violation';
  end if;

  return null;
end;
$$;

-- Transition tables can't be combined with multiple events or a column
-- list, hence two triggers sharing one function.
drop trigger if exists team_members_admin_guard_update on team_members;
create trigger team_members_admin_guard_update
  after update on team_members
  referencing old table as old_rows
  for each statement
  execute function public.ensure_an_admin_remains();

drop trigger if exists team_members_admin_guard_delete on team_members;
create trigger team_members_admin_guard_delete
  after delete on team_members
  referencing old table as old_rows
  for each statement
  execute function public.ensure_an_admin_remains();

commit;
