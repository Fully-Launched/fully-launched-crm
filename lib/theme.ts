// Branch badge colors are fixed regardless of brand palette (functional,
// not brand). Brand colors themselves live in app/globals.css CSS variables
// and tailwind.config.ts — never hardcode brand colors in components.

export type Branch = "Media" | "Websites" | "Ecommerce" | "AI";

// Order and values mirror the `projects_branch_check` constraint (migration
// 008, which renamed Marketplace -> Ecommerce).
export const BRANCHES: Branch[] = ["Media", "Websites", "Ecommerce", "AI"];

export const BRANCH_COLORS: Record<Branch, string> = {
  Media: "bg-blue-100 text-blue-800 border border-blue-300",
  Websites: "bg-yellow-100 text-yellow-800 border border-yellow-300",
  Ecommerce: "bg-red-100 text-red-800 border border-red-300",
  AI: "bg-green-100 text-green-800 border border-green-300",
};

// Hex equivalents of BRANCH_COLORS for chart fills (recharts can't consume
// Tailwind classes). Same fixed hues, just a different format. Red/AI-green
// stay close for deuteranopia at any shade — the branch chart always pairs
// these with a direct text label, never color alone.
export const BRANCH_CHART_COLORS: Record<Branch, string> = {
  Media: "#2563eb",
  Websites: "#ca8a04",
  Ecommerce: "#dc2626",
  AI: "#16a34a",
};

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

// Stage badge colors: Leads gray, Interested fuchsia, Signed indigo, In
// Progress amber, Complete green, Subscriber teal, Lost red. Interested
// avoids blue (Media branch, pinned owner). Lost/Ecommerce (red) and
// Complete/AI (green) overlap by choice.
export const STAGE_COLORS: Record<Stage, string> = {
  Leads: "bg-neutral-100 text-neutral-700 border border-neutral-300",
  Interested: "bg-fuchsia-100 text-fuchsia-800 border border-fuchsia-300",
  Signed: "bg-indigo-100 text-indigo-800 border border-indigo-300",
  "In Progress": "bg-amber-100 text-amber-800 border border-amber-300",
  Complete: "bg-green-100 text-green-800 border border-green-300",
  Subscriber: "bg-teal-100 text-teal-800 border border-teal-300",
  Lost: "bg-red-100 text-red-800 border border-red-300",
};

// Hex equivalents of STAGE_COLORS for chart fills. Same hue family as the
// badges above; the stage chart always keeps its x-axis category labels on
// so identity never depends on color alone (Complete/Subscriber sit close
// together for full-color viewers too).
export const STAGE_CHART_COLORS: Record<Stage, string> = {
  Leads: "#737373",
  Interested: "#d946ef",
  Signed: "#6366f1",
  "In Progress": "#f59e0b",
  Complete: "#22c55e",
  Subscriber: "#0d9488",
  Lost: "#ef4444",
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
  | "Relationship"
  | "Inbound";

export const SOURCES: Source[] = [
  "Cold Call",
  "Email",
  "LinkedIn",
  "Instagram",
  "Facebook",
  "Website",
  "Referral",
  "Relationship",
  "Inbound",
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

// Per-person pill colors for Owner/Salesperson (assigned in memberColors(),
// lib/team.ts). Pinned members are matched by email — stable across name
// changes. Everyone else gets the next color in the rotation, in roster
// order, so a newly added member gets a color with no code change.
export const PINNED_MEMBER_COLORS: Record<string, string> = {
  "luke@fullylaunched.com": "bg-blue-100 text-blue-800 border border-blue-300",
};

export const MEMBER_COLOR_ROTATION: string[] = [
  "bg-purple-100 text-purple-800 border border-purple-300",
  "bg-orange-100 text-orange-800 border border-orange-300",
  "bg-emerald-100 text-emerald-800 border border-emerald-300",
  "bg-pink-100 text-pink-800 border border-pink-300",
  "bg-cyan-100 text-cyan-800 border border-cyan-300",
  "bg-lime-100 text-lime-800 border border-lime-300",
];

// Fallback for an id with no roster row (e.g. a deleted member still listed
// on a project).
export const UNKNOWN_MEMBER_COLOR =
  "bg-neutral-100 text-neutral-700 border border-neutral-300";

export type Role = "Admin" | "Manager" | "Salesperson";

// Mirrors the `team_members_role_check` constraint (migration 002), which is
// the source of truth — if the constraint changes, update this list too.
export const ROLES: Role[] = ["Admin", "Manager", "Salesperson"];
