import Link from "next/link";
import type { BranchSlug } from "@/lib/branches";
import type { ProjectView } from "@/lib/projects";

const VIEWS: { view: ProjectView; label: string }[] = [
  { view: "table", label: "Table" },
  { view: "kanban", label: "Kanban" },
];

export default function ViewToggle({
  tab,
  current,
}: {
  tab: BranchSlug;
  current: ProjectView;
}) {
  return (
    <div className="inline-flex rounded-md border border-neutral-300 p-0.5 text-sm">
      {VIEWS.map(({ view, label }) => (
        <Link
          key={view}
          href={view === "table" ? `/projects/${tab}?view=table` : `/projects/${tab}`}
          aria-current={view === current ? "page" : undefined}
          className={`rounded px-3 py-1 font-medium ${
            view === current
              ? "bg-header text-header-foreground"
              : "text-neutral-600 hover:bg-neutral-50"
          }`}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
