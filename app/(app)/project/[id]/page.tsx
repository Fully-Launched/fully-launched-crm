import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Project, ProjectTask, TeamMember } from "@/lib/types";
import ProjectDetail from "@/components/ProjectDetail";

export default async function ProjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const [{ data: project }, { data: teamMembers }, { data: tasks }] =
    await Promise.all([
      supabase.from("projects").select("*").eq("id", params.id).maybeSingle(),
      supabase.from("team_members").select("*").order("name"),
      supabase
        .from("project_tasks")
        .select("*")
        .eq("project_id", params.id)
        .order("due_date", { ascending: true, nullsFirst: false }),
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
      />
    </div>
  );
}
