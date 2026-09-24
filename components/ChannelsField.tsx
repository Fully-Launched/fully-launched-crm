"use client";

import { useRef, useState } from "react";
import Popover from "@/components/table/Popover";
import { CHANNEL_INPUTS } from "@/lib/channels";
import type { Branch } from "@/lib/theme";

const PILL = "rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700";

// Edits projects.channels. The input is driven by branch (see
// lib/channels.ts): multi-select, single-select, or free-text tags. All
// three commit a string[] (null when empty) — single-select is a
// one-element array.
export default function ChannelsField({
  branch,
  value,
  onCommit,
}: {
  branch: Branch | null;
  value: string[] | null;
  onCommit: (channels: string[] | null) => void;
}) {
  const channels = value ?? [];

  if (!branch) {
    return (
      <span className="px-1.5 py-1 text-sm text-neutral-400">
        Set a branch first
      </span>
    );
  }

  const input = CHANNEL_INPUTS[branch];
  const commit = (next: string[]) => onCommit(next.length ? next : null);

  if (input.kind === "tags") {
    return <TagInput channels={channels} onCommit={commit} />;
  }
  return (
    <SelectInput
      options={input.options}
      multiple={input.kind === "multi"}
      channels={channels}
      onCommit={commit}
    />
  );
}

function SelectInput({
  options,
  multiple,
  channels,
  onCommit,
}: {
  options: string[];
  multiple: boolean;
  channels: string[];
  onCommit: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  function pick(opt: string) {
    if (multiple) {
      onCommit(
        channels.includes(opt)
          ? channels.filter((c) => c !== opt)
          : [...channels, opt]
      );
    } else {
      onCommit(channels[0] === opt ? [] : [opt]);
      setOpen(false);
    }
  }

  return (
    <div ref={ref} className="min-w-[9rem]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-[1.75rem] w-full flex-wrap items-center gap-1 rounded px-1.5 py-1 text-left hover:bg-neutral-50"
      >
        {channels.length === 0 ? (
          <span className="text-neutral-400">—</span>
        ) : (
          channels.map((c) => (
            <span key={c} className={PILL}>
              {c}
            </span>
          ))
        )}
      </button>

      <Popover
        anchorRef={ref}
        open={open}
        onClose={() => setOpen(false)}
        className="w-48 p-1"
      >
        {options.map((opt) => (
          <label
            key={opt}
            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-neutral-50"
          >
            <input
              type={multiple ? "checkbox" : "radio"}
              checked={channels.includes(opt)}
              // Radios don't fire onChange when re-clicked; onClick lets a
              // second click on the selected option clear it.
              onChange={multiple ? () => pick(opt) : undefined}
              onClick={multiple ? undefined : () => pick(opt)}
              readOnly={!multiple}
            />
            {opt}
          </label>
        ))}
      </Popover>
    </div>
  );
}

function TagInput({
  channels,
  onCommit,
}: {
  channels: string[];
  onCommit: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const tag = draft.trim();
    setDraft("");
    if (!tag) return;
    // Case-insensitive dedupe so "OpenAI" and "openai" don't both land.
    if (channels.some((c) => c.toLowerCase() === tag.toLowerCase())) return;
    onCommit([...channels, tag]);
  }

  return (
    <div className="flex min-w-[9rem] flex-wrap items-center gap-1 px-1.5 py-1">
      {channels.map((c) => (
        <span key={c} className={`${PILL} flex items-center gap-1`}>
          {c}
          <button
            type="button"
            onClick={() => onCommit(channels.filter((x) => x !== c))}
            aria-label={`Remove ${c}`}
            className="text-neutral-400 hover:text-neutral-700"
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
        placeholder={channels.length ? "" : "Type and press Enter"}
        className="min-w-[6rem] flex-1 rounded px-1 py-0.5 text-sm outline-none focus:bg-neutral-50"
      />
    </div>
  );
}
