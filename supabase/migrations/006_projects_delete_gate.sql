-- Fully Launched CRM — migration 006
-- Restricts DELETE on projects to Admins. Select/insert/update stay open to
-- every authenticated user.
--
-- Why: projects had the blanket "authenticated full access" policy, so any
-- signed-in user could delete any project via the Supabase API. Deleting a
-- project is destructive: project_tasks cascade (project_tasks_client_id_fkey,
-- ON DELETE CASCADE), while transactions and contacts are kept but unlinked
-- (ON DELETE SET NULL, migrations 002/003).
--
-- Note: a delete blocked by RLS does not raise an error — it just affects
-- zero rows. Callers must check the returned rows, not only `error`.
--
-- Run once, after 005, in the Supabase SQL Editor. No data is touched.
-- Depends on public.is_admin() from migration 005.

begin;

drop policy if exists "authenticated full access" on projects;
drop policy if exists "authenticated select" on projects;
drop policy if exists "authenticated insert" on projects;
drop policy if exists "authenticated update" on projects;
drop policy if exists "admin delete" on projects;

create policy "authenticated select" on projects
  for select
  to authenticated
  using (true);

create policy "authenticated insert" on projects
  for insert
  to authenticated
  with check (true);

create policy "authenticated update" on projects
  for update
  to authenticated
  using (true)
  with check (true);

create policy "admin delete" on projects
  for delete
  to authenticated
  using (public.is_admin());

commit;
