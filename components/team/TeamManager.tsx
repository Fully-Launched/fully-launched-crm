"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ROLES, type Role } from "@/lib/theme";
import type { TeamMember } from "@/lib/types";
import {
  countAdmins,
  friendlyTeamError,
  normalizeEmail,
  roleLock,
} from "@/lib/team";
import AddTeamMemberForm from "@/components/team/AddTeamMemberForm";
import ConfirmDialog from "@/components/ConfirmDialog";

function byName(a: TeamMember, b: TeamMember) {
  return a.name.localeCompare(b.name);
}

export default function TeamManager({
  initialMembers,
  currentUserId,
}: {
  initialMembers: TeamMember[];
  currentUserId: string | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [members, setMembers] = useState<TeamMember[]>(initialMembers);
  const [error, setError] = useState<string | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<TeamMember | null>(
    null
  );

  const adminCount = countAdmins(members);

  async function addMember(input: {
    name: string;
    email: string;
    role: Role;
  }): Promise<boolean> {
    const { data, error } = await supabase
      .from("team_members")
      .insert({ ...input, email: normalizeEmail(input.email) })
      .select()
      .single();

    if (error || !data) {
      setError(
        error ? friendlyTeamError(error) : "Could not add team member"
      );
      return false;
    }
    setError(null);
    setMembers((prev) => [...prev, data as TeamMember].sort(byName));
    return true;
  }

  async function saveRole(id: string, role: Role) {
    const previous = members;
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, role } : m)));

    const { data, error } = await supabase
      .from("team_members")
      .update({ role })
      .eq("id", id)
      .select("id");

    // An RLS-refused update isn't an error in PostgREST — it just matches
    // zero rows — so treat "no row came back" as a refusal too.
    if (error || !data || data.length === 0) {
      setMembers(previous);
      setError(
        error ? friendlyTeamError(error) : "Only Admins can change the team."
      );
      return;
    }
    setError(null);
  }

  function requestRoleChange(member: TeamMember, role: Role) {
    if (role === member.role) return;
    // Promotion grants Transactions + Team access — confirm first.
    if (role === "Admin") {
      setPendingPromotion(member);
      return;
    }
    saveRole(member.id, role);
  }

  return (
    <div className="space-y-6">
      <AddTeamMemberForm onAdd={addMember} />

      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50">
              {["Name", "Email", "Role", "Added"].map((h) => (
                <th
                  key={h}
                  className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const lock = roleLock(m, currentUserId, adminCount);
              return (
                <tr
                  key={m.id}
                  className="border-b border-neutral-100 last:border-0"
                >
                  <td className="px-3 py-2 font-medium text-foreground">
                    {m.name}
                    {m.id === currentUserId && (
                      <span className="ml-2 text-xs font-normal text-neutral-400">
                        (you)
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-neutral-700">{m.email}</td>
                  <td className="px-3 py-2">
                    <select
                      value={m.role}
                      disabled={lock.kind === "self"}
                      onChange={(e) =>
                        requestRoleChange(m, e.target.value as Role)
                      }
                      aria-describedby={
                        lock.kind !== "none" ? `role-lock-${m.id}` : undefined
                      }
                      className="rounded-md border border-neutral-300 px-2 py-1 text-sm outline-none focus:border-accent disabled:bg-neutral-50 disabled:text-neutral-500"
                    >
                      {ROLES.map((r) => (
                        <option
                          key={r}
                          value={r}
                          disabled={
                            lock.kind === "lastAdmin" &&
                            lock.disabledRoles.includes(r)
                          }
                        >
                          {r}
                        </option>
                      ))}
                    </select>
                    {lock.kind !== "none" && (
                      <p
                        id={`role-lock-${m.id}`}
                        className="mt-1 text-xs text-neutral-500"
                      >
                        {lock.reason}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-neutral-500">
                    {new Date(m.created_at).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={pendingPromotion !== null}
        title={
          pendingPromotion
            ? `Make ${pendingPromotion.name} an Admin? They'll get access to Transactions and Team.`
            : ""
        }
        confirmLabel="Make Admin"
        tone="default"
        onCancel={() => setPendingPromotion(null)}
        onConfirm={() => {
          if (pendingPromotion) saveRole(pendingPromotion.id, "Admin");
          setPendingPromotion(null);
        }}
      />
    </div>
  );
}
