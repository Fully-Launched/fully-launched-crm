import Link from "next/link";
import { BRANCH_COLORS } from "@/lib/theme";
import type { Project } from "@/lib/types";

const dateTimeFormat = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export default function UpcomingCallsCard({ calls }: { calls: Project[] }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-5">
      <h2 className="text-sm font-semibold text-foreground">
        Upcoming Scheduled Calls
      </h2>
      <p className="mt-1 text-xs text-neutral-500">Next 7 days</p>

      {calls.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-400">
          No calls scheduled in the next 7 days. This fills in automatically
          once the Cal.com integration is connected.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {calls.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <Link
                  href={`/project/${p.id}`}
                  className="truncate font-medium text-foreground hover:underline"
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
              <span className="shrink-0 whitespace-nowrap text-neutral-500">
                {dateTimeFormat.format(new Date(p.scheduled_call!))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
