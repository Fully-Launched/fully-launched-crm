import { BRANCHES, STAGES, type Branch, type Stage } from "@/lib/theme";
import { isOverdue, type Lead, type Project } from "@/lib/types";
import type { Call } from "@/lib/calls";
import type { UpcomingCall } from "@/components/dashboard/UpcomingCallsCard";
import type { UnmatchedCall } from "@/components/dashboard/UnmatchedCallsCard";

export function stageCounts(projects: Project[]): Record<Stage, number> {
  const counts = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<
    Stage,
    number
  >;
  for (const p of projects) counts[p.stage] += 1;
  return counts;
}

export function branchCounts(projects: Project[]): Record<Branch, number> {
  const counts = Object.fromEntries(BRANCHES.map((b) => [b, 0])) as Record<
    Branch,
    number
  >;
  for (const p of projects) {
    if (p.branch) counts[p.branch] += 1;
  }
  return counts;
}

export type StageValue = { build: number; mrr: number };

// Per stage: build_value summed over Build-on projects, subscription_value
// ($/mo) over Subscription-on projects — same rules as the two stat tiles.
export function valueByStage(
  projects: Project[]
): Record<Stage, StageValue> {
  const totals = Object.fromEntries(
    STAGES.map((s) => [s, { build: 0, mrr: 0 }])
  ) as Record<Stage, StageValue>;
  for (const p of projects) {
    if (p.build) totals[p.stage].build += p.build_value ?? 0;
    if (p.subscription) totals[p.stage].mrr += p.subscription_value ?? 0;
  }
  return totals;
}

// Sum of build_value over projects with Build on (any stage).
export function buildPipeline(projects: Project[]): {
  total: number;
  count: number;
} {
  const builds = projects.filter((p) => p.build);
  return {
    total: builds.reduce((sum, p) => sum + (p.build_value ?? 0), 0),
    count: builds.length,
  };
}

// Sum of subscription_value ($/mo) over projects with Subscription on (any
// stage).
export function subscriptionMrr(projects: Project[]): {
  total: number;
  count: number;
} {
  const subs = projects.filter((p) => p.subscription);
  return {
    total: subs.reduce((sum, p) => sum + (p.subscription_value ?? 0), 0),
    count: subs.length,
  };
}

export function overdueCount(projects: Project[]): number {
  return projects.filter(isOverdue).length;
}

// A calls row with its project links (call_projects), as the Dashboard
// loads it.
export type CallWithLinks = Call & { call_projects: { project_id: string }[] | null };

// Booked Cal.com calls starting in the next 7 days, soonest first, with their
// linked projects. Reads the calls table — projects.scheduled_call is no
// longer used.
export function upcomingCalls(
  calls: CallWithLinks[],
  projects: Project[],
  names: Map<string, string>,
  now: number = Date.now()
): UpcomingCall[] {
  const byId = new Map(projects.map((p) => [p.id, p]));
  const in7Days = now + 7 * 24 * 60 * 60 * 1000;
  return calls
    .filter((c) => {
      const t = Date.parse(c.start_time);
      return c.status === "booked" && t >= now && t <= in7Days;
    })
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
    .map(({ call_projects, ...c }) => ({
      ...c,
      hostName: c.team_member_id ? names.get(c.team_member_id) ?? null : null,
      projects: (call_projects ?? []).flatMap((l) => {
        const p = byId.get(l.project_id);
        return p ? [{ id: p.id, client_name: p.client_name, branch: p.branch }] : [];
      }),
    }));
}

// Booked calls with no linked project, newest first. Cancelled and
// rescheduled-away bookings are left out (nothing to act on).
export function unmatchedCalls(
  calls: CallWithLinks[],
  names: Map<string, string>,
  limit = 20
): UnmatchedCall[] {
  return calls
    .filter((c) => c.status === "booked" && (c.call_projects ?? []).length === 0)
    .sort((a, b) => b.start_time.localeCompare(a.start_time))
    .slice(0, limit)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .map(({ call_projects, ...c }) => ({
      ...c,
      hostName: c.team_member_id ? names.get(c.team_member_id) ?? null : null,
    }));
}

export function recentLeads(leads: Lead[], limit = 8): Lead[] {
  return [...leads]
    .sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, limit);
}
