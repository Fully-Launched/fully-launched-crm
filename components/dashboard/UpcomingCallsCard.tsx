import Link from "next/link";
import { BRANCH_COLORS, type Branch } from "@/lib/theme";
import LocalDateTime from "@/components/LocalDateTime";
import type { Call } from "@/lib/calls";

export type UpcomingCall = Call & {
  projects: { id: string; client_name: string; branch: Branch | null }[];
  hostName: string | null;
};

// Booked Cal.com calls in the next 7 days (from the calls table). A call
// linked to several projects (same contact) lists each.
export default function UpcomingCallsCard({ calls }: { calls: UpcomingCall[] }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-5">
      <h2 className="text-sm font-semibold text-foreground">
        Upcoming Scheduled Calls
      </h2>
      <p className="mt-1 text-xs text-neutral-500">Next 7 days</p>

      {calls.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-400">
          No calls scheduled in the next 7 days.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {calls.map((c) => (
            <li key={c.id} className="flex items-start justify-between gap-3 text-sm">
              <div className="min-w-0">
                {c.projects.length === 0 ? (
                  <span className="font-medium text-foreground">
                    {c.attendee_name || c.attendee_email || "Unknown attendee"}
                    <span className="ml-2 text-xs font-normal text-neutral-400">
                      unmatched
                    </span>
                  </span>
                ) : (
                  c.projects.map((p) => (
                    <div key={p.id} className="truncate">
                      <Link
                        href={`/project/${p.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {p.client_name}
                      </Link>
                      {p.branch && (
                        <span
                          className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${BRANCH_COLORS[p.branch]}`}
                        >
                          {p.branch}
                        </span>
                      )}
                    </div>
                  ))
                )}
                {c.hostName && (
                  <span className="block text-xs text-neutral-500">with {c.hostName}</span>
                )}
              </div>
              <span className="shrink-0 text-neutral-500">
                <LocalDateTime iso={c.start_time} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
