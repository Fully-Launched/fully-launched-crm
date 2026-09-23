"use client";

import { useRef, useState } from "react";
import Popover from "@/components/table/Popover";

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

  return (
    <div ref={ref}>
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

      <Popover
        anchorRef={ref}
        open={open}
        onClose={() => setOpen(false)}
        className="w-40 p-1"
      >
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
      </Popover>
    </div>
  );
}
