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

export type OwnerPill = { id: string; name: string; color: string };

function CardBody({
  project,
  owners,
  showBranch,
}: {
  project: Project;
  owners: OwnerPill[];
  showBranch: boolean;
}) {
  const overdue = isOverdue(project);
  // Build and/or Subscription amounts, whichever toggles are on.
  const amounts = [
    project.build && project.build_value != null
      ? currencyFormat.format(project.build_value)
      : null,
    project.subscription && project.subscription_value != null
      ? `${currencyFormat.format(project.subscription_value)}/mo`
      : null,
  ].filter(Boolean);
  return (
    <>
      <p className="font-semibold text-foreground">
        {project.client_name}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {showBranch && project.branch && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${BRANCH_COLORS[project.branch]}`}
          >
            {project.branch}
          </span>
        )}
        {owners.map((o) => (
          <span
            key={o.id}
            className={`rounded-full px-2 py-0.5 text-xs ${o.color}`}
          >
            {o.name}
          </span>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-neutral-700">
          {amounts.length ? amounts.join(" · ") : "—"}
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
  owners,
  showBranch,
  href,
  isClickSuppressed,
}: {
  project: Project;
  owners: OwnerPill[];
  // Only on the All board — on a branch board every card shares the branch.
  showBranch: boolean;
  href: string;
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
      {/* Stretched link: covers the whole card so a click anywhere opens
          the detail page. */}
      <Link
        href={href}
        draggable={false}
        onClick={(e) => {
          if (isClickSuppressed()) e.preventDefault();
        }}
        className="absolute inset-0 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        aria-label={`Open ${project.client_name}`}
      />
      <CardBody project={project} owners={owners} showBranch={showBranch} />
    </div>
  );
}

// Static copy rendered in the DragOverlay while dragging — no drag/link
// wiring, just the visuals.
export function KanbanCardPreview({
  project,
  owners,
  showBranch,
}: {
  project: Project;
  owners: OwnerPill[];
  showBranch: boolean;
}) {
  return (
    <div className={`${CARD_CLASS} cursor-grabbing shadow-lg`}>
      <CardBody project={project} owners={owners} showBranch={showBranch} />
    </div>
  );
}
