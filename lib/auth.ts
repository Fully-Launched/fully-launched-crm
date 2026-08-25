import { createClient } from "@/lib/supabase/server";
import type { TeamMember } from "@/lib/types";

// Matches the signed-in auth user to their team_members row by email.
// Returns null if there's no session or no matching roster entry.
export async function getCurrentTeamMember(): Promise<TeamMember | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;

  const { data } = await supabase
    .from("team_members")
    .select("*")
    .eq("email", user.email)
    .maybeSingle();

  return (data as TeamMember) ?? null;
}
