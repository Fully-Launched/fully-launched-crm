import { notFound } from "next/navigation";
import {
  isBranchSlug,
  branchLabel,
  branchValue,
  type BranchSlug,
} from "@/lib/branches";
import { BRANCH_COLORS, type Branch } from "@/lib/theme";
import type { Project, TeamMember } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import ProjectsTable from "@/components/ProjectsTable";
import ProjectsKanban from "@/components/kanban/ProjectsKanban";
import ViewToggle from "@/components/ViewToggle";

export default async function ProjectsPage({
  params,
  searchParams,
}: {
  params: { branch: string };
  searchParams: { view?: string };
}) {
  if (!isBranchSlug(params.branch)) {
    notFound();
  }

  const slug = params.branch as BranchSlug;
  const label = branchLabel(slug);
  const branch = branchValue(slug);
  const view = searchParams.view === "kanban" ? "kanban" : "table";

  const supabase = createClient();

  let projectsQuery = supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (branch) {
    projectsQuery = projectsQuery.eq("branch", branch);
  }

  const [{ data: projects }, { data: teamMembers }] = await Promise.all([
    projectsQuery,
    supabase.from("team_members").select("*").order("name"),
  ]);

  return (
    <div className="p-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-foreground">{label}</h1>
        {branch && (
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${BRANCH_COLORS[branch as Branch]}`}
          >
            {branch}
          </span>
        )}
        <div className="ml-auto">
          <ViewToggle tab={slug} current={view} />
        </div>
      </div>

      <div className="mt-6">
        {view === "kanban" ? (
          <ProjectsKanban
            initialProjects={(projects ?? []) as Project[]}
            teamMembers={(teamMembers ?? []) as TeamMember[]}
            tab={slug}
          />
        ) : (
          <ProjectsTable
            initialProjects={(projects ?? []) as Project[]}
            teamMembers={(teamMembers ?? []) as TeamMember[]}
            fixedBranch={branch}
          />
        )}
      </div>
    </div>
  );
}
