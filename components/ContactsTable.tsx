"use client";

import { useMemo, useState } from "react";
import { STAGE_COLORS, type Stage } from "@/lib/theme";
import type { Contact } from "@/lib/types";

export default function ContactsTable({ contacts }: { contacts: Contact[] }) {
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return contacts;
    return contacts.filter((c) =>
      [c.name, c.company, c.email, c.phone]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(query))
    );
  }, [contacts, search]);

  return (
    <div>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search contacts..."
        className="mb-3 w-full max-w-sm rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
      />

      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full min-w-[800px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Company</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2">Stage</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-3 py-2">{c.name || <span className="text-neutral-400">—</span>}</td>
                <td className="px-3 py-2">{c.company || <span className="text-neutral-400">—</span>}</td>
                <td className="px-3 py-2">{c.email || <span className="text-neutral-400">—</span>}</td>
                <td className="px-3 py-2">{c.phone || <span className="text-neutral-400">—</span>}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    {c.stage ? (
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STAGE_COLORS[c.stage as Stage]}`}
                      >
                        {c.stage}
                      </span>
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                    {!c.project_id && (
                      <span className="text-xs text-neutral-400">(project deleted)</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-400">
                  {contacts.length === 0
                    ? "No contacts yet — they're created automatically once a project has a contact name."
                    : "No contacts match your search."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
