"use client";

import { useRef, useState } from "react";
import { useClickOutside } from "@/lib/hooks/useClickOutside";

export type FilterOption = { value: string; label: string };

export type ColumnFilter =
  | { type: "text" }
  | { type: "enum"; options: FilterOption[] };

export default function ColumnHeader({
  label,
  sortDir,
  onSortToggle,
  filter,
  filterValue,
  onFilterChange,
}: {
  label: string;
  sortDir: "asc" | "desc" | null;
  onSortToggle: () => void;
  filter?: ColumnFilter;
  filterValue: string | string[];
  onFilterChange: (value: string | string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  const isFiltered =
    filter?.type === "enum"
      ? (filterValue as string[]).length > 0
      : Boolean(filterValue);

  return (
    <div className="flex items-center gap-1 whitespace-nowrap">
      <button
        type="button"
        onClick={onSortToggle}
        className="flex items-center gap-1 hover:text-accent"
      >
        {label}
        {sortDir === "asc" && <span aria-hidden>↑</span>}
        {sortDir === "desc" && <span aria-hidden>↓</span>}
      </button>

      {filter && (
        <div ref={ref} className="relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={`Filter ${label}`}
            className={`rounded px-1 text-xs ${
              isFiltered
                ? "text-accent"
                : "text-neutral-400 hover:text-neutral-600"
            }`}
          >
            ▾
          </button>

          {open && (
            <div className="absolute left-0 top-full z-20 mt-1 w-52 rounded-md border border-neutral-200 bg-white p-2 text-left font-normal normal-case text-neutral-800 shadow-lg">
              {filter.type === "text" ? (
                <input
                  autoFocus
                  type="text"
                  value={filterValue as string}
                  onChange={(e) => onFilterChange(e.target.value)}
                  placeholder={`Search ${label.toLowerCase()}...`}
                  className="w-full rounded border border-neutral-300 px-2 py-1 text-sm"
                />
              ) : (
                <div className="max-h-52 space-y-0.5 overflow-auto">
                  {filter.options.map((opt) => {
                    const selected = (filterValue as string[]).includes(
                      opt.value
                    );
                    return (
                      <label
                        key={opt.value}
                        className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-neutral-50"
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => {
                            const current = filterValue as string[];
                            onFilterChange(
                              selected
                                ? current.filter((v) => v !== opt.value)
                                : [...current, opt.value]
                            );
                          }}
                        />
                        {opt.label}
                      </label>
                    );
                  })}
                  {filter.options.length === 0 && (
                    <p className="px-1.5 py-1 text-sm text-neutral-400">
                      No options
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
