"use client";

import { useState } from "react";

export default function TextCell({
  value,
  displayValue,
  onCommit,
  placeholder = "—",
  type = "text",
}: {
  value: string | null;
  displayValue?: string;
  onCommit: (value: string) => void;
  placeholder?: string;
  type?: "text" | "email" | "tel" | "number";
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(value ?? "");
          setEditing(true);
        }}
        title={value ?? undefined}
        className="block w-full max-w-[16rem] truncate rounded px-1.5 py-1 text-left hover:bg-neutral-50"
      >
        {value ? (
          displayValue ?? value
        ) : (
          <span className="text-neutral-400">{placeholder}</span>
        )}
      </button>
    );
  }

  function commit() {
    setEditing(false);
    if (draft !== (value ?? "")) {
      onCommit(draft);
    }
  }

  return (
    <input
      autoFocus
      type={type}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          (e.target as HTMLInputElement).blur();
        } else if (e.key === "Escape") {
          setDraft(value ?? "");
          setEditing(false);
        }
      }}
      className="w-full min-w-[8rem] rounded border border-accent px-1.5 py-1 text-sm outline-none"
    />
  );
}
