"use client";

import { useState } from "react";
import type { ContactGroup } from "@/lib/contacts";

// Confirm step for "Merge as one contact": pick whose name the merged row
// shows. Every company/branch from every selected row is kept.
export default function MergeContactsDialog({
  groups,
  merging,
  onConfirm,
  onCancel,
}: {
  groups: ContactGroup[];
  merging: boolean;
  onConfirm: (primaryId: string) => void;
  onCancel: () => void;
}) {
  const [primaryId, setPrimaryId] = useState(groups[0]?.primaryId ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
        <p className="text-sm font-semibold text-neutral-800">
          Merge {groups.length} contacts into one?
        </p>
        <p className="mt-1 text-sm text-neutral-500">
          Pick the name to show. All their companies and branches are kept on
          the merged contact. The merge is saved and stays through future
          syncs from Projects.
        </p>

        <div className="mt-4 space-y-1">
          {groups.map((g) => (
            <label
              key={g.key}
              className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 hover:bg-neutral-50"
            >
              <input
                type="radio"
                name="primary-contact"
                checked={primaryId === g.primaryId}
                onChange={() => setPrimaryId(g.primaryId)}
                className="mt-1"
              />
              <span className="text-sm">
                <span className="font-medium text-neutral-800">
                  {g.name || "(no name)"}
                </span>
                <span className="block text-xs text-neutral-500">
                  {g.companies.map((c) => c.company).join(", ") || "No company"}
                  {g.emails.length > 0 && ` · ${g.emails.join(", ")}`}
                </span>
              </span>
            </label>
          ))}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={merging}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(primaryId)}
            disabled={merging || !primaryId}
            className="rounded-md bg-header px-3 py-1.5 text-sm font-medium text-header-foreground disabled:opacity-50"
          >
            {merging ? "Merging…" : "Merge"}
          </button>
        </div>
      </div>
    </div>
  );
}
