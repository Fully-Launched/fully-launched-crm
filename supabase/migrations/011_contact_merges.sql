-- Fully Launched CRM — migration 011
-- Manual contact merges ("these rows are the same person").
--
-- The Contacts page auto-groups rows at display time (same name + email, or
-- same name + company when there's no email). contact_merges records the
-- merges it can't infer — e.g. the same person under two companies — so they
-- survive future syncs from Projects.
--
-- One row per merged-away contact: contact_id is shown as part of
-- primary_contact_id's group, under the primary's name. The contacts table
-- and its sync trigger are untouched: the trigger upserts on project_id and
-- never deletes, so contact ids are stable across syncs. If either contact
-- row is ever deleted, its mapping goes with it (on delete cascade).
--
-- merge_contacts() applies a merge in one transaction and keeps the mapping
-- flat (every member points straight at the primary, never at another
-- member), so merging an already-merged group just re-points it.
--
-- Access matches contacts: every authenticated user (not role-gated).
--
-- Run once, after 010, in the Supabase SQL Editor. Creates a new table and
-- function; no existing data is touched.

begin;

create table if not exists contact_merges (
  contact_id uuid primary key references contacts(id) on delete cascade,
  primary_contact_id uuid not null references contacts(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (contact_id <> primary_contact_id)
);

create index if not exists contact_merges_primary_idx
  on contact_merges (primary_contact_id);

alter table contact_merges enable row level security;

drop policy if exists "authenticated full access" on contact_merges;
create policy "authenticated full access" on contact_merges
  for all
  to authenticated
  using (true)
  with check (true);

-- p_members: every contact id in the rows being merged (any may include
-- p_primary). Security invoker, so the caller's RLS applies as usual.
create or replace function public.merge_contacts(
  p_primary uuid,
  p_members uuid[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_primary is null or coalesce(array_length(p_members, 1), 0) = 0 then
    raise exception 'merge_contacts needs a primary and at least one member';
  end if;

  -- The primary heads the group, so it can't itself be merged into anyone.
  delete from contact_merges where contact_id = p_primary;

  -- Anything already merged into one of the members now points at the new
  -- primary (keeps the mapping one level deep).
  update contact_merges
     set primary_contact_id = p_primary
   where primary_contact_id = any (p_members)
     and contact_id <> p_primary;

  insert into contact_merges (contact_id, primary_contact_id)
  select m, p_primary
    from unnest(p_members) as m
   where m <> p_primary
  on conflict (contact_id) do update
    set primary_contact_id = excluded.primary_contact_id,
        created_at = now();
end;
$$;

revoke all on function public.merge_contacts(uuid, uuid[]) from public, anon;
grant execute on function public.merge_contacts(uuid, uuid[]) to authenticated;

commit;
