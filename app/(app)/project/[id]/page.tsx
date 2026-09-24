import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Project, ProjectTask, TeamMember } from "@/lib/types";
import ProjectDetail from "@/components/ProjectDetail";
import { projectOrigin } from "@/lib/projects";
import { getCurrentTeamMember } from "@/lib/auth";
import { canSendInvoices } from "@/lib/billing";
import { stripeDashboardBase } from "@/lib/stripe";
import type { Call } from "@/lib/calls";

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { from?: string; tab?: string };
}) {
  const supabase = createClient();

  const [
    { data: project },
    { data: teamMembers },
    { data: tasks },
    currentMember,
    { data: callLinks },
  ] = await Promise.all([
    supabase.from("projects").select("*").eq("id", params.id).maybeSingle(),
    supabase.from("team_members").select("*").order("name"),
    supabase
      .from("project_tasks")
      .select("*")
      .eq("project_id", params.id)
      .order("due_date", { ascending: true, nullsFirst: false }),
    getCurrentTeamMember(),
    // Cal.com calls linked to this project (migration 012).
    supabase.from("call_projects").select("call:calls(*)").eq("project_id", params.id),
  ]);
  const calls = ((callLinks ?? []) as unknown as { call: Call | null }[])
    .map((l) => l.call)
    .filter((c): c is Call => c !== null);

  if (!project) {
    notFound();
  }

  return (
    <div className="p-8">
      <ProjectDetail
        initialProject={project as Project}
        teamMembers={(teamMembers ?? []) as TeamMember[]}
        initialTasks={(tasks ?? []) as ProjectTask[]}
        back={projectOrigin(searchParams.from, searchParams.tab)}
        // UI only — the real gate is the "admin or manager delete" RLS policy (migration 007)
        canDelete={
          currentMember?.role === "Admin" || currentMember?.role === "Manager"
        }
        // UI only — the invoice route re-checks the role server-side.
        canInvoice={canSendInvoices(currentMember?.role)}
        stripeDashboardBase={stripeDashboardBase()}
        currentMemberId={currentMember?.id ?? null}
        calls={calls}
      />
    </div>
  );
}
