// Branch badge colors are fixed regardless of brand palette (functional,
// not brand). Brand colors themselves live in app/globals.css CSS variables
// and tailwind.config.ts — never hardcode brand colors in components.

export type Branch = "Media" | "Websites" | "Marketplace" | "AI";

export const BRANCHES: Branch[] = ["Media", "Websites", "Marketplace", "AI"];

export const BRANCH_COLORS: Record<Branch, string> = {
  Media: "bg-blue-100 text-blue-800 border border-blue-300",
  Websites: "bg-yellow-100 text-yellow-800 border border-yellow-300",
  Marketplace: "bg-red-100 text-red-800 border border-red-300",
  AI: "bg-green-100 text-green-800 border border-green-300",
};

// Hex equivalents of BRANCH_COLORS for chart fills (recharts can't consume
// Tailwind classes). Same fixed hues, just a different format. Red/AI-green
// stay close for deuteranopia at any shade — the branch chart always pairs
// these with a direct text label, never color alone.
export const BRANCH_CHART_COLORS: Record<Branch, string> = {
  Media: "#2563eb",
  Websites: "#ca8a04",
  Marketplace: "#dc2626",
  AI: "#16a34a",
};

// Stage isn't given fixed colors in the spec (unlike Branch) — this is a
// placeholder sequential palette, swappable here in one place.
export type Stage =
  | "Leads"
  | "Interested"
  | "Signed"
  | "In Progress"
  | "Complete"
  | "Subscriber"
  | "Lost";

// Order mirrors the `projects_stage_check` constraint in
// supabase/migrations/002_projects_transactions_roles.sql, which is the
// source of truth. Kanban columns, the Table's stage sort, and the dashboard
// all follow this order — if the constraint changes, update this list too.
export const STAGES: Stage[] = [
  "Leads",
  "Interested",
  "Signed",
  "In Progress",
  "Complete",
  "Subscriber",
  "Lost",
];

export const STAGE_COLORS: Record<Stage, string> = {
  Leads: "bg-neutral-100 text-neutral-700 border border-neutral-300",
  Interested: "bg-sky-100 text-sky-800 border border-sky-300",
  Signed: "bg-violet-100 text-violet-800 border border-violet-300",
  "In Progress": "bg-amber-100 text-amber-800 border border-amber-300",
  Complete: "bg-emerald-100 text-emerald-800 border border-emerald-300",
  Subscriber: "bg-teal-100 text-teal-800 border border-teal-300",
  Lost: "bg-rose-100 text-rose-800 border border-rose-300",
};

// Hex equivalents of STAGE_COLORS for chart fills. Same hue family as the
// badges above; the stage chart always keeps its x-axis category labels on
// so identity never depends on color alone (Complete/Subscriber sit close
// together for full-color viewers too).
export const STAGE_CHART_COLORS: Record<Stage, string> = {
  Leads: "#737373",
  Interested: "#0ea5e9",
  Signed: "#8b5cf6",
  "In Progress": "#f59e0b",
  Complete: "#10b981",
  Subscriber: "#0d9488",
  Lost: "#f43f5e",
};

// Stages that no longer count as "active" for overdue-date highlighting.
export const CLOSED_STAGES: Stage[] = ["Complete", "Subscriber", "Lost"];

export type Source =
  | "Cold Call"
  | "Email"
  | "LinkedIn"
  | "Instagram"
  | "Facebook"
  | "Website"
  | "Referral"
  | "Relationship";

export const SOURCES: Source[] = [
  "Cold Call",
  "Email",
  "LinkedIn",
  "Instagram",
  "Facebook",
  "Website",
  "Referral",
  "Relationship",
];

export type PaymentStatus =
  | "Waiting for Deposit"
  | "Deposit Paid"
  | "Waiting for Payment"
  | "Paid";

export const PAYMENT_STATUSES: PaymentStatus[] = [
  "Waiting for Deposit",
  "Deposit Paid",
  "Waiting for Payment",
  "Paid",
];

export type Role = "Admin" | "Manager" | "Salesperson";

export const ROLES: Role[] = ["Admin", "Manager", "Salesperson"];
