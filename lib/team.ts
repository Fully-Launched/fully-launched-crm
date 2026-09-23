import type { Role } from "@/lib/theme";
import type { TeamMember } from "@/lib/types";

// team_members RLS and the transactions policy both match
// auth.jwt() ->> 'email' exactly, and Supabase login emails are lowercase —
// a mixed-case roster email would silently fail every Admin check.
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function countAdmins(members: TeamMember[]): number {
  return members.filter((m) => m.role === "Admin").length;
}

// UI mirror of the DB guards from migration 005 (the DB is the real gate):
// - you can't change your own role (would let an Admin lock themselves out
//   of this page mid-edit)
// - the only Admin can't be demoted (ensure_an_admin_remains trigger)
export type RoleLock =
  | { kind: "none" }
  | { kind: "self"; reason: string }
  | { kind: "lastAdmin"; reason: string; disabledRoles: Role[] };

export function roleLock(
  member: TeamMember,
  currentUserId: string | null,
  adminCount: number
): RoleLock {
  // Checked first: since only Admins can open /team, the sole Admin is
  // always the viewer, and the more specific last-Admin reason should win
  // over the generic self lock.
  if (member.role === "Admin" && adminCount <= 1) {
    return {
      kind: "lastAdmin",
      reason: "Only Admin — promote someone else to Admin first.",
      disabledRoles: ["Manager", "Salesperson"],
    };
  }
  if (member.id === currentUserId) {
    return { kind: "self", reason: "You can't change your own role." };
  }
  return { kind: "none" };
}

// Postgres error codes -> something readable. Falls back to the raw message.
export function friendlyTeamError(error: {
  code?: string;
  message: string;
}): string {
  switch (error.code) {
    case "23505":
      return "A team member with that email already exists.";
    case "23514":
      return error.message.includes("Admin must remain")
        ? "At least one Admin must remain on the team."
        : error.message;
    case "42501":
      return "Only Admins can change the team.";
    default:
      return error.message;
  }
}
