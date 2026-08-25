"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SOURCES } from "@/lib/theme";
import type { Lead } from "@/lib/types";
import TextCell from "@/components/table/TextCell";

export default function LeadsTable({
  initialLeads,
}: {
  initialLeads: Lead[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [error, setError] = useState<string | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  async function updateLead(id: string, patch: Partial<Lead>) {
    const previous = leads;
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    const { error } = await supabase.from("leads").update(patch).eq("id", id);
    if (error) {
      setLeads(previous);
      setError(error.message);
    }
  }

  async function addLead() {
    const { data, error } = await supabase
      .from("leads")
      .insert({ name: "New Lead" })
      .select()
      .single();
    if (error || !data) {
      setError(error?.message ?? "Could not create lead");
      return;
    }
    setLeads((prev) => [data as Lead, ...prev]);
  }

  async function addToProject(lead: Lead) {
    setConvertingId(lead.id);
    const matchedSource = SOURCES.find(
      (s) => s.toLowerCase() === (lead.source ?? "").toLowerCase()
    );
    const { data, error } = await supabase
      .from("projects")
      .insert({
        client_name: lead.name,
        source: matchedSource ?? null,
        stage: "Leads",
        notes: [lead.contact_info, lead.notes].filter(Boolean).join("\n") || null,
      })
      .select()
      .single();

    setConvertingId(null);
    if (error || !data) {
      setError(error?.message ?? "Could not create project from lead");
      return;
    }
    router.push(`/project/${data.id}`);
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-neutral-500">{leads.length} lead{leads.length === 1 ? "" : "s"}</p>
        <button
          type="button"
          onClick={addLead}
          className="rounded-md bg-header px-3 py-1.5 text-sm font-medium text-header-foreground"
        >
          + New Lead
        </button>
      </div>

      {error && (
        <p className="mb-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
              <th className="px-2 py-2">Name</th>
              <th className="px-2 py-2">Source</th>
              <th className="px-2 py-2">Contact Info</th>
              <th className="px-2 py-2">Notes</th>
              <th className="px-2 py-2">Date Added</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-1 py-1 align-top">
                  <TextCell
                    value={lead.name}
                    onCommit={(v) => updateLead(lead.id, { name: v })}
                  />
                </td>
                <td className="px-1 py-1 align-top">
                  <TextCell
                    value={lead.source}
                    onCommit={(v) => updateLead(lead.id, { source: v })}
                  />
                </td>
                <td className="px-1 py-1 align-top">
                  <TextCell
                    value={lead.contact_info}
                    onCommit={(v) => updateLead(lead.id, { contact_info: v })}
                  />
                </td>
                <td className="px-1 py-1 align-top">
                  <TextCell
                    value={lead.notes}
                    onCommit={(v) => updateLead(lead.id, { notes: v })}
                  />
                </td>
                <td className="px-2 py-2 align-top text-neutral-500">
                  {new Date(lead.created_at).toLocaleDateString()}
                </td>
                <td className="px-1 py-1 align-top">
                  <button
                    type="button"
                    onClick={() => addToProject(lead)}
                    disabled={convertingId === lead.id}
                    className="whitespace-nowrap rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                  >
                    {convertingId === lead.id ? "Adding..." : "Add to Project"}
                  </button>
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                  No leads yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
