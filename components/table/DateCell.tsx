"use client";

import { useState } from "react";

export default function DateCell({
  value,
  onCommit,
  overdue = false,
}: {
  value: string | null;
  onCommit: (value: string | null) => void;
  overdue?: boolean;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <input
        autoFocus
        type="date"
        defaultValue={value ?? ""}
        onBlur={(e) => {
          setEditing(false);
          const next = e.target.value || null;
          if (next !== value) onCommit(next);
        }}
        className="w-full rounded border border-accent px-1.5 py-1 text-sm outline-none"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={`block w-full rounded px-1.5 py-1 text-left ${
        overdue ? "bg-red-50 text-red-700" : "hover:bg-neutral-50"
      }`}
    >
      {value ? (
        new Date(`${value}T00:00:00`).toLocaleDateString()
      ) : (
        <span className="text-neutral-400">—</span>
      )}
    </button>
  );
}
