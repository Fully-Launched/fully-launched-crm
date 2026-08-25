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

// Stages that no longer count as "active" for overdue-date highlighting.
export const CLOSED_STAGES: Stage[] = ["Complete", "Subscriber", "Lost"];

export type Source =
  | "Cold Call"
  | "Email"
  | "LinkedIn"
  | "Instagram"
  | "Facebook"
  | "Website"
  | "Referral";

export const SOURCES: Source[] = [
  "Cold Call",
  "Email",
  "LinkedIn",
  "Instagram",
  "Facebook",
  "Website",
  "Referral",
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
