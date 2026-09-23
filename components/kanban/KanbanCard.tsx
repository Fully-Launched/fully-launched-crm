"use client";

import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";
import { BRANCH_COLORS } from "@/lib/theme";
import { isOverdue, type Project } from "@/lib/types";

const currencyFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function CardBody({
  project,
  ownerNames,
}: {
  project: Project;
  ownerNames: string[];
}) {
  const overdue = isOverdue(project);
  return (
    <>
      <p className="pr-16 font-semibold text-foreground">
        {project.client_name}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {project.branch && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${BRANCH_COLORS[project.branch]}`}
          >
            {project.branch}
          </span>
        )}
        {ownerNames.map((name) => (
          <span
            key={name}
            className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700"
          >
            {name}
          </span>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-neutral-700">
          {project.value != null ? currencyFormat.format(project.value) : "—"}
        </span>
        {project.target_date && (
          <span
            className={`rounded px-1.5 py-0.5 ${
              overdue ? "bg-red-50 text-red-700" : "text-neutral-500"
            }`}
          >
            {new Date(`${project.target_date}T00:00:00`).toLocaleDateString()}
          </span>
        )}
      </div>
    </>
  );
}

const CARD_CLASS =
  "relative rounded-lg border border-neutral-200 bg-background p-3 text-sm shadow-sm";

export default function KanbanCard({
  project,
  ownerNames,
  href,
  onDuplicate,
  isClickSuppressed,
}: {
  project: Project;
  ownerNames: string[];
  href: string;
  onDuplicate: () => void;
  isClickSuppressed: () => boolean;
}) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: project.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`${CARD_CLASS} cursor-grab touch-none hover:border-neutral-300 ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      {/* Stretched link: its ::after covers the whole card so a click
          anywhere opens the detail page, while the Duplicate button sits
          above it (z-10) and stays independently clickable. */}
      <Link
        href={href}
        draggable={false}
        onClick={(e) => {
          if (isClickSuppressed()) e.preventDefault();
        }}
        className="absolute inset-0 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        aria-label={`Open ${project.client_name}`}
      />
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        onClick={onDuplicate}
        className="absolute right-2 top-2 z-10 rounded-md px-1.5 py-0.5 text-xs font-medium text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
      >
        Duplicate
      </button>
      <CardBody project={project} ownerNames={ownerNames} />
    </div>
  );
}

// Static copy rendered in the DragOverlay while dragging — no drag/link
// wiring, just the visuals.
export function KanbanCardPreview({
  project,
  ownerNames,
}: {
  project: Project;
  ownerNames: string[];
}) {
  return (
    <div className={`${CARD_CLASS} cursor-grabbing shadow-lg`}>
      <CardBody project={project} ownerNames={ownerNames} />
    </div>
  );
}
