import { createClient } from "@/lib/supabase/server";
import type { Contact } from "@/lib/types";
import type { Branch } from "@/lib/theme";
import type { ContactMerge, ContactRow } from "@/lib/contacts";
import ContactsTable from "@/components/ContactsTable";

export default async function ContactsPage() {
  const supabase = createClient();
  const [{ data: contacts }, { data: merges, error: mergesError }] =
    await Promise.all([
      // Branch comes from the linked project; null once it's deleted.
      supabase
        .from("contacts")
        .select("*, project:projects(branch)")
        .order("created_at", { ascending: false }),
      supabase.from("contact_merges").select("contact_id, primary_contact_id"),
    ]);

  if (mergesError) console.error("Loading contact_merges failed", mergesError);

  const rows: ContactRow[] = (
    (contacts ?? []) as (Contact & { project: { branch: Branch | null } | null })[]
  ).map(({ project, ...c }) => ({ ...c, branch: project?.branch ?? null }));

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-foreground">Contacts</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Master list of every client — past, present, and future. Synced
        automatically from Projects; a contact stays here even if its project
        is later deleted. Rows for the same person are grouped automatically
        (same name and email, or same name and company when there&apos;s no
        email); select rows and use Merge to group any others.
      </p>

      <div className="mt-6">
        <ContactsTable
          contacts={rows}
          merges={(merges ?? []) as ContactMerge[]}
        />
      </div>
    </div>
  );
}
