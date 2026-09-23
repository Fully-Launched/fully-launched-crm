-- Fully Launched CRM — migration 003
-- transactions.project_id: ON DELETE CASCADE -> ON DELETE SET NULL, so
-- transactions survive project deletion (same pattern as contacts.project_id).
--
-- Run once, after 002, in the Supabase SQL Editor. Only the FK action changes;
-- no rows are touched.

-- ── transactions.project_id: cascade -> set null ────────────────────────
-- Look up the existing FK by inspecting pg_constraint instead of guessing its
-- auto-generated name (e.g. `transactions_project_id_fkey`) — a wrong guess
-- would leave the cascading FK in place alongside the new one, and the
-- cascade would still delete transactions with their project.
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
    where rel.relname = 'transactions'
      and con.contype = 'f'
      and att.attname = 'project_id'
  loop
    execute format('alter table transactions drop constraint %I', r.conname);
  end loop;
end $$;

alter table transactions
  add constraint transactions_project_id_fkey
  foreign key (project_id) references projects(id) on delete set null;
