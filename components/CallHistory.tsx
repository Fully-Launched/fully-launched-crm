import type { TeamMember } from "@/lib/types";
import { CALL_STATUS_COLORS } from "@/lib/theme";
import { callDisplayStatus, sortCallsForHistory, type Call } from "@/lib/calls";
import LocalDateTime from "@/components/LocalDateTime";

// Calls section on the Manage Project page: every Cal.com booking linked to
// this project (via call_projects), upcoming first, then past. Cancelled and
// rescheduled bookings stay listed with their status.
export default function CallHistory({
  calls,
  teamMembers,
}: {
  calls: Call[];
  teamMembers: TeamMember[];
}) {
  const names = new Map(teamMembers.map((m) => [m.id, m.name]));
  const rows = sortCallsForHistory(calls);

  return (
    <div className="rounded-lg border border-neutral-200 p-5">
      <h2 className="text-sm font-semibold text-foreground">Calls</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-400">
          No calls yet. Calls booked through Cal.com show up here automatically.
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                <th className="pb-2 pr-4 font-semibold">When</th>
                <th className="pb-2 pr-4 font-semibold">With</th>
                <th className="pb-2 pr-4 font-semibold">Team member</th>
                <th className="pb-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const status = callDisplayStatus(c);
                const host =
                  (c.team_member_id && names.get(c.team_member_id)) ||
                  c.organizer_email ||
                  "—";
                const bookedBy = c.booked_by ? names.get(c.booked_by) : null;
                return (
                  <tr key={c.id} className="border-t border-neutral-100 align-top">
                    <td className="py-2 pr-4 text-neutral-700">
                      <LocalDateTime iso={c.start_time} />
                    </td>
                    <td className="py-2 pr-4">
                      <span className="text-foreground">
                        {c.attendee_name || c.attendee_email || "—"}
                      </span>
                      {c.attendee_name && c.attendee_email && (
                        <span className="block text-xs text-neutral-400">
                          {c.attendee_email}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-neutral-700">
                      {host}
                      {bookedBy && bookedBy !== host && (
                        <span className="block text-xs text-neutral-400">
                          booked by {bookedBy}
                        </span>
                      )}
                    </td>
                    <td className="py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${CALL_STATUS_COLORS[status]}`}
                      >
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
