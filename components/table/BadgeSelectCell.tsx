"use client";

import { useRef, useState } from "react";
import { useClickOutside } from "@/lib/hooks/useClickOutside";

export default function BadgeSelectCell({
  value,
  options,
  colors,
  onCommit,
  placeholder = "—",
}: {
  value: string | null;
  options: string[];
  colors: Record<string, string>;
  onCommit: (value: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="block rounded px-1 py-0.5 text-left hover:bg-neutral-50"
      >
        {value ? (
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[value]}`}
          >
            {value}
          </span>
        ) : (
          <span className="px-1.5 text-sm text-neutral-400">
            {placeholder}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-40 rounded-md border border-neutral-200 bg-white p-1 shadow-lg">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onCommit(opt);
                setOpen(false);
              }}
              className="flex w-full items-center rounded px-2 py-1 text-left hover:bg-neutral-50"
            >
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[opt]}`}
              >
                {opt}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
