"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Project, ProjectTask, TeamMember } from "@/lib/types";
import {
  BRANCHES,
  BRANCH_COLORS,
  PAYMENT_STATUSES,
  SOURCES,
  STAGES,
  STAGE_COLORS,
  type Branch,
  type PaymentStatus,
  type Stage,
} from "@/lib/theme";
import TextCell from "@/components/table/TextCell";
import DateCell from "@/components/table/DateCell";
import BadgeSelectCell from "@/components/table/BadgeSelectCell";
import MultiSelectCell from "@/components/table/MultiSelectCell";
import ProjectTasksManager from "@/components/ProjectTasksManager";

const currencyFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const SOURCE_COLORS = Object.fromEntries(
  SOURCES.map((s) => [s, "bg-neutral-100 text-neutral-700 border border-neutral-300"])
);

const PAYMENT_STATUS_ORDER: PaymentStatus[] = [
  "Waiting for Deposit",
  "Deposit Paid",
  "Waiting for Payment",
  "Paid",
];

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      {children}
    </div>
  );
}

export default function ProjectDetail({
  initialProject,
  teamMembers,
  initialTasks,
}: {
  initialProject: Project;
  teamMembers: TeamMember[];
  initialTasks: ProjectTask[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [project, setProject] = useState<Project>(initialProject);
  const [error, setError] = useState<string | null>(null);
  const [invoiceNotice, setInvoiceNotice] = useState<string | null>(null);

  async function update(patch: Partial<Project>) {
    const previous = project;
    setProject((prev) => ({ ...prev, ...patch }));
    const { error } = await supabase
      .from("projects")
      .update(patch)
      .eq("id", project.id);
    if (error) {
      setProject(previous);
      setError(error.message);
    } else {
      setError(null);
    }
  }

  const depositCleared =
    !!project.payment_status &&
    PAYMENT_STATUS_ORDER.indexOf(project.payment_status) >=
      PAYMENT_STATUS_ORDER.indexOf("Deposit Paid");

  function placeholderInvoice(label: string) {
    setInvoiceNotice(
      `${label}: Stripe isn't connected yet, so this is a placeholder. Real invoicing lands in a later build step.`
    );
  }

  return (
    <div>
      <Link href="/projects/all" className="text-sm text-accent hover:underline">
        ← Back to Projects
      </Link>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-foreground">
          {project.client_name}
        </h1>
        <BadgeSelectCell
          value={project.branch}
          options={BRANCHES}
          colors={BRANCH_COLORS}
          onCommit={(v) => update({ branch: v as Branch })}
        />
        <BadgeSelectCell
          value={project.stage}
          options={STAGES}
          colors={STAGE_COLORS}
          onCommit={(v) => update({ stage: v as Stage })}
        />
      </div>

      {error && (
        <p className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 rounded-lg border border-neutral-200 p-5 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Client / Project Name">
          <TextCell value={project.client_name} onCommit={(v) => update({ client_name: v })} />
        </Field>
        <Field label="Contact Name">
          <TextCell value={project.contact_name} onCommit={(v) => update({ contact_name: v })} />
        </Field>
        <Field label="Email">
          <TextCell type="email" value={project.email} onCommit={(v) => update({ email: v })} />
        </Field>
        <Field label="Phone">
          <TextCell type="tel" value={project.phone} onCommit={(v) => update({ phone: v })} />
        </Field>
        <Field label="Owner">
          <MultiSelectCell
            teamMembers={teamMembers}
            selectedIds={project.owner}
            onCommit={(ids) => update({ owner: ids })}
          />
        </Field>
        <Field label="Salesperson">
          <MultiSelectCell
            teamMembers={teamMembers}
            selectedIds={project.salesperson}
            onCommit={(ids) => update({ salesperson: ids })}
          />
        </Field>
        <Field label="Source">
          <BadgeSelectCell
            value={project.source}
            options={SOURCES}
            colors={SOURCE_COLORS}
            onCommit={(v) => update({ source: v })}
          />
        </Field>
        <Field label="Value">
          <TextCell
            type="number"
            value={project.value != null ? String(project.value) : null}
            displayValue={project.value != null ? currencyFormat.format(project.value) : undefined}
            onCommit={(v) => update({ value: v === "" ? null : Number(v) })}
          />
        </Field>
        <Field label="Target Date">
          <DateCell value={project.target_date} onCommit={(v) => update({ target_date: v })} />
        </Field>
        <Field label="End Date">
          <DateCell value={project.end_date} onCommit={(v) => update({ end_date: v })} />
        </Field>
        {project.stage === "Lost" && (
          <Field label="Lost Reason">
            <TextCell value={project.lost_reason} onCommit={(v) => update({ lost_reason: v })} />
          </Field>
        )}
        <Field label="Commission Rate (%)">
          <TextCell
            type="number"
            value={String(project.commission_rate)}
            onCommit={(v) => update({ commission_rate: v === "" ? 0 : Number(v) })}
          />
        </Field>
        <div className="sm:col-span-2 lg:col-span-3">
          <Field label="Notes">
            <TextCell value={project.notes} onCommit={(v) => update({ notes: v })} />
          </Field>
        </div>
      </div>

      {invoiceNotice && (
        <p className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {invoiceNotice}
        </p>
      )}

      <div className="mt-6 rounded-lg border border-neutral-200 p-5">
        <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <input
            type="checkbox"
            checked={project.build}
            onChange={(e) => update({ build: e.target.checked })}
            className="h-4 w-4"
          />
          Build
        </label>

        {project.build && (
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Build Value">
              <TextCell
                type="number"
                value={project.build_value != null ? String(project.build_value) : null}
                displayValue={
                  project.build_value != null ? currencyFormat.format(project.build_value) : undefined
                }
                onCommit={(v) => update({ build_value: v === "" ? null : Number(v) })}
              />
            </Field>
            <Field label="Payment Status">
              <select
                value={project.payment_status ?? ""}
                onChange={(e) =>
                  update({ payment_status: (e.target.value || null) as PaymentStatus | null })
                }
                className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
              >
                <option value="">—</option>
                {PAYMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Build End Date">
              <DateCell value={project.build_end_date} onCommit={(v) => update({ build_end_date: v })} />
            </Field>
            <Field label="Invoicing">
              <button
                type="button"
                onClick={() =>
                  placeholderInvoice(depositCleared ? "Invoice for Build" : "Invoice for Deposit")
                }
                className="rounded-md bg-header px-3 py-1.5 text-sm font-medium text-header-foreground"
              >
                {depositCleared ? "Invoice for Build" : "Invoice for Deposit"}
              </button>
            </Field>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-lg border border-neutral-200 p-5">
        <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <input
            type="checkbox"
            checked={project.subscription}
            onChange={(e) => update({ subscription: e.target.checked })}
            className="h-4 w-4"
          />
          Subscription
        </label>

        {project.subscription && (
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Subscription Value ($/mo)">
              <TextCell
                type="number"
                value={project.subscription_value != null ? String(project.subscription_value) : null}
                displayValue={
                  project.subscription_value != null
                    ? `${currencyFormat.format(project.subscription_value)}/mo`
                    : undefined
                }
                onCommit={(v) => update({ subscription_value: v === "" ? null : Number(v) })}
              />
            </Field>
            <Field label="Deliver Date">
              <DateCell value={project.deliver_date} onCommit={(v) => update({ deliver_date: v })} />
            </Field>
            <Field label="Invoicing">
              <button
                type="button"
                onClick={() => placeholderInvoice("Send Monthly Invoice")}
                className="rounded-md bg-header px-3 py-1.5 text-sm font-medium text-header-foreground"
              >
                Send Monthly Invoice
              </button>
            </Field>
          </div>
        )}
      </div>

      <div className="mt-6">
        <ProjectTasksManager
          projectId={project.id}
          teamMembers={teamMembers}
          initialTasks={initialTasks}
        />
      </div>
    </div>
  );
}
