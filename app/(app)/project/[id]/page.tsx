import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Project, ProjectTask, TeamMember } from "@/lib/types";
import ProjectDetail from "@/components/ProjectDetail";
import { projectOrigin } from "@/lib/projects";
import { getCurrentTeamMember } from "@/lib/auth";

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
  ] = await Promise.all([
    supabase.from("projects").select("*").eq("id", params.id).maybeSingle(),
    supabase.from("team_members").select("*").order("name"),
    supabase
      .from("project_tasks")
      .select("*")
      .eq("project_id", params.id)
      .order("due_date", { ascending: true, nullsFirst: false }),
    getCurrentTeamMember(),
  ]);

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
      />
    </div>
  );
}
