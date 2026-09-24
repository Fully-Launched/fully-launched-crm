"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import LocalDateTime from "@/components/LocalDateTime";
import type { Call } from "@/lib/calls";

export type UnmatchedCall = Call & { hostName: string | null };

// Cal.com bookings the webhook couldn't link to any project (no metadata and
// no contact-email match). "Assign" links one via assign_call_to_project()
// (migration 012), after which it moves to that project's Calls section.
export default function UnmatchedCallsCard({
  calls,
  projects,
}: {
  calls: UnmatchedCall[];
  projects: { id: string; client_name: string; branch: string | null }[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const options = useMemo(
    () =>
      [...projects].sort((a, b) =>
        a.client_name.localeCompare(b.client_name)
      ),
    [projects]
  );

  async function assign(callId: string) {
    const projectId = choice[callId];
    if (!projectId) return;
    setBusy(callId);
    const { error } = await supabase.rpc("assign_call_to_project", {
      p_call_id: callId,
      p_project_id: projectId,
    });
    setBusy(null);
    if (error) {
      setError(error.message);
      return;
    }
    setError(null);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-neutral-200 p-5">
      <h2 className="text-sm font-semibold text-foreground">Unmatched Calls</h2>
      <p className="mt-1 text-xs text-neutral-500">
        Cal.com bookings that didn&apos;t match a project&apos;s contact email
      </p>

      {error && (
        <p className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {calls.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-400">
          Every call is matched to a project.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-neutral-100">
          {calls.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm"
            >
              <div className="min-w-0">
                <span className="font-medium text-foreground">
                  {c.attendee_name || c.attendee_email || "Unknown attendee"}
                </span>
                {c.attendee_name && c.attendee_email && (
                  <span className="ml-2 text-xs text-neutral-400">{c.attendee_email}</span>
                )}
                <span className="block text-xs text-neutral-500">
                  <LocalDateTime iso={c.start_time} />
                  {c.hostName && ` · with ${c.hostName}`}
                  {c.status !== "booked" && ` · ${c.status}`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={choice[c.id] ?? ""}
                  onChange={(e) =>
                    setChoice((prev) => ({ ...prev, [c.id]: e.target.value }))
                  }
                  aria-label="Project to assign this call to"
                  className="max-w-[14rem] rounded-md border border-neutral-300 px-2 py-1 text-sm"
                >
                  <option value="">Choose project…</option>
                  {options.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.client_name}
                      {p.branch ? ` (${p.branch})` : ""}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => assign(c.id)}
                  disabled={!choice[c.id] || busy === c.id}
                  className="rounded-md bg-header px-3 py-1 text-sm font-medium text-header-foreground disabled:opacity-50"
                >
                  {busy === c.id ? "Assigning…" : "Assign to project"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
