"use client";

import { useRef, useState } from "react";
import { useClickOutside } from "@/lib/hooks/useClickOutside";
import type { TeamMember } from "@/lib/types";

export default function MultiSelectCell({
  teamMembers,
  selectedIds,
  onCommit,
}: {
  teamMembers: TeamMember[];
  selectedIds: string[];
  onCommit: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  const selected = teamMembers.filter((m) => selectedIds.includes(m.id));

  function toggle(id: string) {
    onCommit(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
    );
  }

  return (
    <div ref={ref} className="relative min-w-[9rem]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-[1.75rem] w-full flex-wrap items-center gap-1 rounded px-1.5 py-1 text-left hover:bg-neutral-50"
      >
        {selected.length === 0 ? (
          <span className="text-neutral-400">—</span>
        ) : (
          selected.map((m) => (
            <span
              key={m.id}
              className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700"
            >
              {m.name}
            </span>
          ))
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-48 rounded-md border border-neutral-200 bg-white p-1 shadow-lg">
          {teamMembers.map((m) => (
            <label
              key={m.id}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-neutral-50"
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(m.id)}
                onChange={() => toggle(m.id)}
              />
              {m.name}
            </label>
          ))}
          {teamMembers.length === 0 && (
            <p className="px-2 py-1 text-sm text-neutral-400">
              No team members yet
            </p>
          )}
        </div>
      )}
    </div>
  );
}
