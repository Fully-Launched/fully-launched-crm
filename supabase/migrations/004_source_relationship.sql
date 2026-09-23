-- Fully Launched CRM — migration 004
-- Adds 'Relationship' to the fixed projects.source list.
--
-- Run once, after 003, in the Supabase SQL Editor. Only widens the allowed
-- values; existing rows are all still valid, so no data is touched.

alter table projects drop constraint if exists projects_source_check;

alter table projects
  add constraint projects_source_check
  check (source is null or source in ('Cold Call', 'Email', 'LinkedIn', 'Instagram', 'Facebook', 'Website', 'Referral', 'Relationship'));
