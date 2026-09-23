import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTeamMember } from "@/lib/auth";
import type { TeamMember } from "@/lib/types";
import TeamManager from "@/components/team/TeamManager";

export default async function TeamPage() {
  const teamMember = await getCurrentTeamMember();

  // Frontend gate — the tab is also hidden from nav for non-Admins. The real
  // enforcement is the Admin-only write policies on `team_members`
  // (migration 005), so this is belt-and-suspenders, not the source of truth.
  if (teamMember?.role !== "Admin") {
    redirect("/dashboard");
  }

  const supabase = createClient();
  const { data: members } = await supabase
    .from("team_members")
    .select("*")
    .order("name");

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-foreground">Team</h1>
      <p className="mt-1 text-sm text-neutral-500">Admin only.</p>

      <div className="mt-6">
        <TeamManager
          initialMembers={(members ?? []) as TeamMember[]}
          currentUserId={teamMember.id}
        />
      </div>
    </div>
  );
}
