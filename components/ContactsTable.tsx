"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BRANCH_COLORS } from "@/lib/theme";
import {
  groupContacts,
  groupMatches,
  type ContactGroup,
  type ContactMerge,
  type ContactRow,
} from "@/lib/contacts";
import MergeContactsDialog from "@/components/MergeContactsDialog";
import ConfirmDialog from "@/components/ConfirmDialog";
import TextCell from "@/components/table/TextCell";

const dash = <span className="text-neutral-400">—</span>;

// Contact fields live on projects; the sync trigger copies them to contacts.
type ContactField = "name" | "email" | "phone";
const PROJECT_FIELD = {
  name: "contact_name",
  email: "email",
  phone: "phone",
} as const;
const FIELD_LABEL: Record<ContactField, string> = {
  name: "name",
  email: "email",
  phone: "phone",
};

type PendingEdit = { group: ContactGroup; field: ContactField; value: string };

function companySummary(companies: string[]): string {
  const counts = new Map<string, number>();
  for (const c of companies) counts.set(c, (counts.get(c) ?? 0) + 1);
  return Array.from(counts, ([c, n]) => (n > 1 ? `${c} ×${n}` : c)).join(", ");
}

export default function ContactsTable({
  contacts,
  merges,
}: {
  contacts: ContactRow[];
  merges: ContactMerge[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [merging, setMerging] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingEdit, setPendingEdit] = useState<PendingEdit | null>(null);
  const [saving, setSaving] = useState(false);

  const groups = useMemo(
    () => groupContacts(contacts, merges),
    [contacts, merges]
  );
  const rows = useMemo(
    () => groups.filter((g) => groupMatches(g, search)),
    [groups, search]
  );
  const selectedGroups = groups.filter((g) => selected.has(g.key));

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function currentValues(group: ContactGroup, field: ContactField): string[] {
    if (field === "name") return group.name ? [group.name] : [];
    return field === "email" ? group.emails : group.phones;
  }

  // Inline edit -> every live project behind the contact. With 2+ projects
  // it asks first (see editConfirmTitle); with one it saves straight away.
  function requestEdit(group: ContactGroup, field: ContactField, raw: string) {
    const value = raw.trim();
    if (field === "name" && !value) {
      setError("A contact needs a name.");
      return;
    }
    if (group.liveProjectIds.length > 1) {
      setPendingEdit({ group, field, value });
    } else {
      void saveEdit({ group, field, value });
    }
  }

  async function saveEdit({ group, field, value }: PendingEdit) {
    setPendingEdit(null);
    setSaving(true);
    try {
      // Auto-grouping keys on name + email (or company). Editing name/email
      // could split the group — e.g. rows from deleted projects keep the old
      // value, or clearing a shared email across different companies. Pin
      // multi-row groups as a merge first (a live row as primary) so the
      // person stays one contact. Phone isn't part of the key.
      if (field !== "phone" && group.ids.length > 1 && group.livePrimaryId) {
        const { error: mergeError } = await supabase.rpc("merge_contacts", {
          p_primary: group.livePrimaryId,
          p_members: group.ids,
        });
        if (mergeError) {
          setError(mergeError.message);
          return;
        }
      }

      const { data, error: updateError } = await supabase
        .from("projects")
        .update({ [PROJECT_FIELD[field]]: value || null })
        .in("id", group.liveProjectIds)
        .select("id");
      if (updateError) {
        setError(updateError.message);
        return;
      }
      if ((data?.length ?? 0) !== group.liveProjectIds.length) {
        setError(
          `Updated ${data?.length ?? 0} of ${group.liveProjectIds.length} projects — reload and check.`
        );
      } else {
        setError(null);
      }
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  function editConfirmTitle({ group, field, value }: PendingEdit): string {
    const n = group.liveProjectIds.length;
    const replacing = currentValues(group, field);
    return [
      `Change the ${FIELD_LABEL[field]} to "${value || "(empty)"}" on ${n} projects (${companySummary(group.liveCompanies)})?`,
      replacing.length ? `Replaces: ${replacing.join(", ")}.` : "",
      field === "email" ? "This is also where Stripe invoices for these projects are sent." : "",
      group.hasFrozen ? "Rows from deleted projects keep their old values." : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  // Editable cell, or plain read-only text when no live project backs it.
  function fieldCell(group: ContactGroup, field: ContactField) {
    const values = currentValues(group, field);
    if (group.liveProjectIds.length === 0) {
      return (
        <span title="Read-only — every project for this contact was deleted">
          {values.length ? values.map((v) => <div key={v}>{v}</div>) : dash}
        </span>
      );
    }
    return (
      <TextCell
        type={field === "email" ? "email" : field === "phone" ? "tel" : "text"}
        value={values[0] ?? null}
        displayValue={values.join(", ")}
        onCommit={(v) => requestEdit(group, field, v)}
      />
    );
  }

  // Deletes every contact_merges row touching this group. Rows that still
  // match automatically (same name + email/company) stay grouped; everything
  // else splits back out. No confirm: nothing is lost and it can be
  // re-merged, and the button only appears on merged rows.
  async function unmerge(group: ContactGroup) {
    setSaving(true);
    const ids = group.ids.join(",");
    const { error: unmergeError } = await supabase
      .from("contact_merges")
      .delete()
      .or(`contact_id.in.(${ids}),primary_contact_id.in.(${ids})`);
    setSaving(false);
    if (unmergeError) {
      setError(unmergeError.message);
      return;
    }
    setError(null);
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(group.key);
      return next;
    });
    router.refresh();
  }

  async function merge(primaryId: string) {
    setMerging(true);
    const { error } = await supabase.rpc("merge_contacts", {
      p_primary: primaryId,
      p_members: selectedGroups.flatMap((g) => g.ids),
    });
    setMerging(false);
    if (error) {
      setError(error.message);
      return;
    }
    setError(null);
    setConfirmOpen(false);
    setSelected(new Set());
    router.refresh();
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search contacts..."
          className="w-full max-w-sm rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
        />
        {selectedGroups.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-neutral-600">
              {selectedGroups.length} selected
            </span>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={selectedGroups.length < 2}
              title={
                selectedGroups.length < 2
                  ? "Select at least two contacts to merge"
                  : undefined
              }
              className="rounded-md bg-header px-3 py-1.5 font-medium text-header-foreground disabled:opacity-50"
            >
              Merge as one contact
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="rounded-md px-2 py-1.5 text-neutral-500 hover:text-neutral-800"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {saving && <p className="mb-3 text-sm text-neutral-500">Saving…</p>}

      {error && (
        <p className="mb-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full min-w-[800px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
              <th className="w-10 px-3 py-2">
                <span className="sr-only">Select</span>
              </th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Company</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2">Branch</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((g) => (
              <tr
                key={g.key}
                className={`border-b border-neutral-100 last:border-0 ${
                  selected.has(g.key) ? "bg-neutral-50" : ""
                }`}
              >
                <td className="px-3 py-2 align-top">
                  <input
                    type="checkbox"
                    checked={selected.has(g.key)}
                    onChange={() => toggle(g.key)}
                    aria-label={`Select ${g.name ?? "contact"}`}
                    className="h-4 w-4"
                  />
                </td>
                <td className="px-3 py-2 align-top">
                  {fieldCell(g, "name")}
                  {g.liveProjectIds.length > 1 && (
                    <span className="block px-1.5 text-xs text-neutral-400">
                      {g.liveProjectIds.length} projects
                    </span>
                  )}
                  {g.otherNames.length > 0 && (
                    <span className="block text-xs text-neutral-400">
                      also {g.otherNames.join(", ")}
                    </span>
                  )}
                  {g.hasManualMerge && (
                    <button
                      type="button"
                      onClick={() => unmerge(g)}
                      disabled={saving}
                      title="Split this merged contact back into its original rows"
                      className="px-1.5 text-xs text-accent hover:underline disabled:opacity-50"
                    >
                      Unmerge
                    </button>
                  )}
                </td>
                <td className="px-3 py-2 align-top">
                  {g.companies.length === 0 ? (
                    dash
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {g.companies.map((c) => (
                        <span
                          key={c.company}
                          className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700"
                        >
                          {c.company}
                          {c.allDeleted && (
                            <span className="text-neutral-400"> (project deleted)</span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 align-top">{fieldCell(g, "email")}</td>
                <td className="px-3 py-2 align-top">{fieldCell(g, "phone")}</td>
                <td className="px-3 py-2 align-top">
                  {g.branches.length === 0 ? (
                    dash
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {g.branches.map((b) => (
                        <span
                          key={b}
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${BRANCH_COLORS[b]}`}
                        >
                          {b}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                  {contacts.length === 0
                    ? "No contacts yet — they're created automatically once a project has a contact name."
                    : "No contacts match your search."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={pendingEdit !== null}
        title={pendingEdit ? editConfirmTitle(pendingEdit) : ""}
        confirmLabel={
          pendingEdit ? `Update ${pendingEdit.group.liveProjectIds.length} projects` : ""
        }
        tone="default"
        onCancel={() => setPendingEdit(null)}
        onConfirm={() => pendingEdit && saveEdit(pendingEdit)}
      />

      {confirmOpen && (
        <MergeContactsDialog
          groups={selectedGroups}
          merging={merging}
          onConfirm={merge}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </div>
  );
}
