import { BRANCHES, STAGES, type Branch, type Stage } from "@/lib/theme";
import { isOverdue, type Lead, type Project } from "@/lib/types";

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

export function upcomingCalls(projects: Project[]): Project[] {
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return projects
    .filter((p) => {
      if (!p.scheduled_call) return false;
      const call = new Date(p.scheduled_call);
      return call >= now && call <= in7Days;
    })
    .sort(
      (a, b) =>
        new Date(a.scheduled_call!).getTime() -
        new Date(b.scheduled_call!).getTime()
    );
}

export function recentLeads(leads: Lead[], limit = 8): Lead[] {
  return [...leads]
    .sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, limit);
}
