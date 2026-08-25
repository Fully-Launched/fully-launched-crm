import { createClient } from "@/lib/supabase/server";
import type { Lead } from "@/lib/types";
import LeadsTable from "@/components/LeadsTable";

export default async function LeadsPage() {
  const supabase = createClient();
  const { data: leads } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-foreground">Leads</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Placeholder for Matteo&apos;s AI Lead Finder output.
      </p>

      <div className="mt-6">
        <LeadsTable initialLeads={(leads ?? []) as Lead[]} />
      </div>
    </div>
  );
}
