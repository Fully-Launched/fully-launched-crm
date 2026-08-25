import { createClient } from "@/lib/supabase/server";
import type { Contact } from "@/lib/types";
import ContactsTable from "@/components/ContactsTable";

export default async function ContactsPage() {
  const supabase = createClient();
  const { data: contacts } = await supabase
    .from("contacts")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-foreground">Contacts</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Master list of every client — past, present, and future — with their
        current project stage. Synced automatically from Projects; a contact
        stays here (with its last known stage) even if its project is later
        deleted.
      </p>

      <div className="mt-6">
        <ContactsTable contacts={(contacts ?? []) as Contact[]} />
      </div>
    </div>
  );
}
