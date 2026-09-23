"use client";

import { useDroppable } from "@dnd-kit/core";
import { STAGE_COLORS, type Stage } from "@/lib/theme";

export default function KanbanColumn({
  stage,
  count,
  children,
}: {
  stage: Stage;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg bg-neutral-50">
      <div className="flex items-center justify-between px-3 py-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STAGE_COLORS[stage]}`}
        >
          {stage}
        </span>
        <span className="text-xs text-neutral-500">{count}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-32 flex-1 flex-col gap-2 rounded-b-lg p-2 transition-colors ${
          isOver ? "bg-neutral-100 ring-2 ring-inset ring-accent" : ""
        }`}
      >
        {children}
      </div>
    </div>
  );
}
