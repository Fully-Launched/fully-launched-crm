-- Fully Launched CRM — migration 012
-- Cal.com call history.
--
-- calls: one row per Cal.com booking, written only by the Cal.com webhook
--   (app/api/webhooks/calcom, service role — bypasses RLS). Upserted on
--   cal_uid, so webhook retries don't duplicate. Cancelled and rescheduled
--   bookings stay, with their status.
-- call_projects: which projects a call belongs to. Many-to-many because one
--   contact email can match several live projects (e.g. Hesedea x3); the call
--   is linked to all of them. Calls with no link are "unmatched" and shown on
--   the Dashboard for manual assignment. Deleting a project removes its links
--   but keeps the call.
-- assign_call_to_project(): the Dashboard's "Assign to project" action.
--   Security definer so authenticated users can link a call without having
--   general write access to calls.
--
-- team_members.booking_link already exists (migration 002) — no change there.
--
-- Run once, after 011, in the Supabase SQL Editor. Creates new tables and a
-- function; no existing data is touched.

begin;

create table if not exists calls (
  id uuid primary key default gen_random_uuid(),
  cal_uid text not null unique,
  -- Organizer, matched by email to team_members.email.
  team_member_id uuid references team_members(id) on delete set null,
  -- Who made the booking from the app (metadata[booked_by]).
  booked_by uuid references team_members(id) on delete set null,
  organizer_email text,
  attendee_name text,
  attendee_email text,
  title text,
  start_time timestamptz not null,
  end_time timestamptz,
  status text not null default 'booked'
    check (status in ('booked', 'cancelled', 'rescheduled')),
  -- Set on the old booking when it's rescheduled.
  rescheduled_to_uid text,
  matched_by text not null default 'none'
    check (matched_by in ('metadata', 'email', 'manual', 'none')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists calls_start_time_idx on calls (start_time);

create table if not exists call_projects (
  call_id uuid not null references calls(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  primary key (call_id, project_id)
);

create index if not exists call_projects_project_idx on call_projects (project_id);

alter table calls enable row level security;
alter table call_projects enable row level security;

-- Read-only for the app; all writes come from the webhook (service role) or
-- assign_call_to_project().
drop policy if exists "authenticated read" on calls;
create policy "authenticated read" on calls
  for select to authenticated using (true);

drop policy if exists "authenticated read" on call_projects;
create policy "authenticated read" on call_projects
  for select to authenticated using (true);

create or replace function public.assign_call_to_project(
  p_call_id uuid,
  p_project_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if not exists (select 1 from calls where id = p_call_id) then
    raise exception 'Call not found';
  end if;
  if not exists (select 1 from projects where id = p_project_id) then
    raise exception 'Project not found';
  end if;

  insert into call_projects (call_id, project_id)
  values (p_call_id, p_project_id)
  on conflict do nothing;

  update calls
     set matched_by = 'manual', updated_at = now()
   where id = p_call_id and matched_by = 'none';
end;
$$;

revoke all on function public.assign_call_to_project(uuid, uuid) from public, anon;
grant execute on function public.assign_call_to_project(uuid, uuid) to authenticated;

commit;
