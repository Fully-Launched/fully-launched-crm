"use client";

import { useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { createClient } from "@/lib/supabase/client";
import { STAGES, type Stage } from "@/lib/theme";
import type { Project, TeamMember } from "@/lib/types";
import type { BranchSlug } from "@/lib/branches";
import { duplicateProjectPayload, projectDetailHref } from "@/lib/projects";
import KanbanColumn from "@/components/kanban/KanbanColumn";
import KanbanCard, { KanbanCardPreview } from "@/components/kanban/KanbanCard";

function byUpdatedDesc(a: Project, b: Project) {
  return Date.parse(b.updated_at) - Date.parse(a.updated_at);
}

export default function ProjectsKanban({
  initialProjects,
  teamMembers,
  tab,
}: {
  initialProjects: Project[];
  teamMembers: TeamMember[];
  tab: BranchSlug;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  // True from drag start until just after drop, so the click that can fire
  // on pointerup doesn't also navigate to the detail page.
  const draggingRef = useRef(false);

  const sensors = useSensors(
    // 5px threshold: a plain click opens the card, only a real drag moves it
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    // Space only — Enter is left for the card's link (open detail page)
    useSensor(KeyboardSensor, {
      keyboardCodes: {
        start: ["Space"],
        cancel: ["Escape"],
        end: ["Space", "Enter"],
      },
    })
  );

  const membersById = useMemo(
    () => new Map(teamMembers.map((m) => [m.id, m.name])),
    [teamMembers]
  );

  function ownerNames(p: Project) {
    return p.owner
      .map((id) => membersById.get(id))
      .filter((n): n is string => !!n);
  }

  // Grouped + sorted in one place, so there's no unsorted render path.
  const columns = useMemo(() => {
    const grouped = new Map<Stage, Project[]>(STAGES.map((s) => [s, []]));
    for (const p of projects) grouped.get(p.stage)?.push(p);
    grouped.forEach((list) => list.sort(byUpdatedDesc));
    return grouped;
  }, [projects]);

  const activeProject = activeId
    ? projects.find((p) => p.id === activeId) ?? null
    : null;

  function handleDragStart(event: DragStartEvent) {
    draggingRef.current = true;
    setActiveId(String(event.active.id));
  }

  function endDrag() {
    setActiveId(null);
    setTimeout(() => {
      draggingRef.current = false;
    }, 0);
  }

  async function handleDragEnd(event: DragEndEvent) {
    endDrag();
    const id = String(event.active.id);
    const stage = event.over?.id as Stage | undefined;
    const project = projects.find((p) => p.id === id);
    if (!project || !stage || project.stage === stage) return;

    // Optimistic: move now and bump updated_at so it lands at the top of the
    // new column; the DB trigger sets the real value, synced back below.
    const previous = projects;
    setProjects((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, stage, updated_at: new Date().toISOString() }
          : p
      )
    );

    const { data, error } = await supabase
      .from("projects")
      .update({ stage })
      .eq("id", id)
      .select("updated_at")
      .single();

    if (error || !data) {
      setProjects(previous);
      setError(error?.message ?? "Could not update stage");
      return;
    }
    setError(null);
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, updated_at: data.updated_at } : p))
    );
  }

  async function duplicate(project: Project) {
    const { data, error } = await supabase
      .from("projects")
      .insert(duplicateProjectPayload(project))
      .select()
      .single();

    if (error || !data) {
      setError(error?.message ?? "Could not duplicate project");
      return;
    }
    setError(null);
    setProjects((prev) => [data as Project, ...prev]);
  }

  return (
    <div>
      <p className="mb-3 text-sm text-neutral-500">
        {projects.length} project{projects.length === 1 ? "" : "s"}
      </p>

      {error && (
        <p className="mb-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={endDrag}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const list = columns.get(stage) ?? [];
            return (
              <KanbanColumn key={stage} stage={stage} count={list.length}>
                {list.map((p) => (
                  <KanbanCard
                    key={p.id}
                    project={p}
                    ownerNames={ownerNames(p)}
                    href={projectDetailHref(p.id, "kanban", tab)}
                    onDuplicate={() => duplicate(p)}
                    isClickSuppressed={() => draggingRef.current}
                  />
                ))}
              </KanbanColumn>
            );
          })}
        </div>

        <DragOverlay>
          {activeProject && (
            <KanbanCardPreview
              project={activeProject}
              ownerNames={ownerNames(activeProject)}
            />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
