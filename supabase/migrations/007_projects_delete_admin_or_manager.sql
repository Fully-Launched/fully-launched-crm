-- Fully Launched CRM — migration 007
-- Extends DELETE on projects from Admin-only (migration 006) to Admin or
-- Manager. Select/insert/update on projects are unchanged (open to every
-- authenticated user).
--
-- Deleting a project still cascades its project_tasks; transactions and
-- contacts are kept but unlinked (ON DELETE SET NULL).
--
-- Role is only as trustworthy as team_members.role, which migration 005
-- locked to Admin-only writes — a Manager or Salesperson can't promote
-- themselves into this policy.
--
-- Run once, after 006, in the Supabase SQL Editor. No data is touched.

begin;

-- ── is_admin_or_manager() ────────────────────────────────────────────────
-- Same shape as is_admin() (migration 005): SECURITY DEFINER so it can read
-- team_members regardless of the caller's RLS, pinned search_path so the
-- definer-rights function can't be hijacked.
create or replace function public.is_admin_or_manager()
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
      and tm.role in ('Admin', 'Manager')
  );
$$;

revoke all on function public.is_admin_or_manager() from public, anon;
grant execute on function public.is_admin_or_manager() to authenticated;

-- ── projects delete policy ───────────────────────────────────────────────
drop policy if exists "admin delete" on projects;
drop policy if exists "admin or manager delete" on projects;

create policy "admin or manager delete" on projects
  for delete
  to authenticated
  using (public.is_admin_or_manager());

commit;
