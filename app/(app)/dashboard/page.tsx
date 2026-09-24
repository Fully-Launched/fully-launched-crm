import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Lead, Project } from "@/lib/types";
import {
  branchCounts,
  buildPipeline,
  overdueCount,
  recentLeads,
  stageCounts,
  subscriptionMrr,
  upcomingCalls,
  valueByStage,
} from "@/lib/dashboard";
import StatTile from "@/components/dashboard/StatTile";
import StageChart from "@/components/dashboard/StageChart";
import BranchChart from "@/components/dashboard/BranchChart";
import ValueByStageCard from "@/components/dashboard/ValueByStageCard";
import UpcomingCallsCard from "@/components/dashboard/UpcomingCallsCard";
import RecentLeadsCard from "@/components/dashboard/RecentLeadsCard";

const currencyFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: projectsData }, { data: leadsData }] = await Promise.all([
    supabase.from("projects").select("*"),
    supabase.from("leads").select("*").order("created_at", { ascending: false }),
  ]);
  const projects = (projectsData ?? []) as Project[];
  const pipeline = buildPipeline(projects);
  const mrr = subscriptionMrr(projects);
  const leads = (leadsData ?? []) as Lead[];

  async function signOut() {
    "use server";
    const supabase = createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <div className="p-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Signed in as {user?.email}
          </p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-md bg-header px-4 py-2 text-sm font-medium text-header-foreground"
          >
            Sign out
          </button>
        </form>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Build Pipeline"
          value={currencyFormat.format(pipeline.total)}
          sublabel={`${pipeline.count} build project${pipeline.count === 1 ? "" : "s"}`}
        />
        <StatTile
          label="Subscription MRR"
          value={`${currencyFormat.format(mrr.total)}/mo`}
          sublabel={`${mrr.count} subscription${mrr.count === 1 ? "" : "s"}`}
        />
        <StatTile
          label="Overdue"
          value={String(overdueCount(projects))}
          sublabel="Past target date, still open"
          tone="warning"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <StageChart counts={stageCounts(projects)} />
        <BranchChart counts={branchCounts(projects)} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ValueByStageCard totals={valueByStage(projects)} />
        <UpcomingCallsCard calls={upcomingCalls(projects)} />
        <RecentLeadsCard leads={recentLeads(leads)} />
      </div>
    </div>
  );
}
