import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTeamMember } from "@/lib/auth";
import type { Project, TeamMember, Transaction } from "@/lib/types";
import TransactionsTable from "@/components/TransactionsTable";

export default async function TransactionsPage() {
  const teamMember = await getCurrentTeamMember();

  // Frontend gate — the tab is also hidden from nav for non-Admins. The real
  // enforcement is the RLS policy on `transactions` (Admin-only), so this is
  // belt-and-suspenders, not the source of truth.
  if (teamMember?.role !== "Admin") {
    redirect("/dashboard");
  }

  const supabase = createClient();
  const [{ data: transactions }, { data: projects }, { data: teamMembers }] =
    await Promise.all([
      supabase.from("transactions").select("*").order("date", { ascending: false }),
      supabase.from("projects").select("*").order("client_name"),
      supabase.from("team_members").select("*").order("name"),
    ]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-foreground">Transactions</h1>
      <p className="mt-1 text-sm text-neutral-500">Admin only.</p>

      <div className="mt-6">
        <TransactionsTable
          initialTransactions={(transactions ?? []) as Transaction[]}
          projects={(projects ?? []) as Project[]}
          teamMembers={(teamMembers ?? []) as TeamMember[]}
        />
      </div>
    </div>
  );
}
