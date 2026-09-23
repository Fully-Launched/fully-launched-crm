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

export function valueByStage(projects: Project[]): Record<Stage, number> {
  const totals = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<
    Stage,
    number
  >;
  for (const p of projects) totals[p.stage] += p.value ?? 0;
  return totals;
}

export function totalPipelineValue(projects: Project[]): number {
  return projects.reduce((sum, p) => sum + (p.value ?? 0), 0);
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
