"use client";

import { useState } from "react";
import type { TeamMember } from "@/lib/types";
import { isValidBookingLink } from "@/lib/booking";

// Read-only Team view for non-Admins: who's on the team and their Cal.com
// booking links, so a Salesperson can grab a link without opening a project.
// Links from here aren't pre-filled with a project — the webhook falls back to
// matching the attendee's email.
export default function TeamDirectory({ members }: { members: TeamMember[] }) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(member: TeamMember) {
    if (!member.booking_link) return;
    try {
      await navigator.clipboard.writeText(member.booking_link);
      setCopied(member.id);
      setTimeout(() => setCopied((c) => (c === member.id ? null : c)), 1500);
    } catch {
      // Clipboard blocked — the link is still clickable.
    }
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-50">
            {["Name", "Role", "Booking link"].map((h) => (
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
          {members.map((m) => (
            <tr key={m.id} className="border-b border-neutral-100 last:border-0">
              <td className="px-3 py-2 font-medium text-foreground">{m.name}</td>
              <td className="px-3 py-2 text-neutral-700">{m.role}</td>
              <td className="px-3 py-2">
                {m.booking_link && isValidBookingLink(m.booking_link) ? (
                  <span className="flex flex-wrap items-center gap-3">
                    <a
                      href={m.booking_link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent hover:underline"
                    >
                      {m.booking_link}
                    </a>
                    <button
                      type="button"
                      onClick={() => copy(m)}
                      className="text-xs text-neutral-500 hover:text-foreground"
                    >
                      {copied === m.id ? "Copied" : "Copy"}
                    </button>
                  </span>
                ) : (
                  <span className="text-neutral-400">No link yet</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
