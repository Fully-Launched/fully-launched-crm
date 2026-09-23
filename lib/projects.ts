import { isBranchSlug, branchLabel, type BranchSlug } from "@/lib/branches";
import type { Project } from "@/lib/types";

// ── duplicate ────────────────────────────────────────────────────────────
// Fields never carried over to a copy: identity/timestamps (DB assigns new
// ones), Stripe links (a copy must not point at the original's Stripe
// customer/subscription), and scheduled_call (a booked call belongs to one
// engagement). Transactions and project_tasks live in their own tables and
// are never touched. The copy DOES get its own contacts row — the
// sync_contact_from_project trigger creates one on insert, same as any
// other project (one contact row per project engagement, by design).
type DuplicateOmit =
  | "id"
  | "created_at"
  | "updated_at"
  | "stripe_customer_id"
  | "stripe_subscription_id"
  | "subscription_status"
  | "scheduled_call";

export function duplicateProjectPayload(
  project: Project
): Omit<Project, DuplicateOmit> {
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const {
    id,
    created_at,
    updated_at,
    stripe_customer_id,
    stripe_subscription_id,
    subscription_status,
    scheduled_call,
    ...rest
  } = project;
  /* eslint-enable @typescript-eslint/no-unused-vars */
  return { ...rest, client_name: `${project.client_name} (Copy)` };
}

// ── detail page origin (back link) ──────────────────────────────────────
// The Manage Project page is a separate top-level route, so it can't know
// which view/tab it was opened from. Callers pass it explicitly via
// ?from=table|kanban&tab=<branch slug> rather than relying on router.back(),
// which breaks after client-side view-state changes.
export type ProjectView = "table" | "kanban";

export function projectDetailHref(
  id: string,
  from: ProjectView,
  tab: BranchSlug
): string {
  return `/project/${id}?from=${from}&tab=${tab}`;
}

export function projectOrigin(
  from: string | undefined,
  tab: string | undefined
): { href: string; label: string } {
  const slug: BranchSlug = tab && isBranchSlug(tab) ? tab : "all";
  const kanban = from === "kanban";
  return {
    href: `/projects/${slug}${kanban ? "?view=kanban" : ""}`,
    label: `Back to ${branchLabel(slug)} (${kanban ? "Kanban" : "Table"})`,
  };
}
