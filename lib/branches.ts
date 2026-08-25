import { BRANCHES, type Branch } from "@/lib/theme";

// URL-safe slugs for branch tabs/routes (/projects/[branch]).
export type BranchSlug = "all" | "media" | "websites" | "marketplace" | "ai";

export const BRANCH_SLUGS: BranchSlug[] = [
  "all",
  "media",
  "websites",
  "marketplace",
  "ai",
];

const SLUG_TO_LABEL: Record<BranchSlug, string> = {
  all: "All",
  media: "Media",
  websites: "Websites",
  marketplace: "Marketplace",
  ai: "AI",
};

export function isBranchSlug(value: string): value is BranchSlug {
  return (BRANCH_SLUGS as string[]).includes(value);
}

export function branchLabel(slug: BranchSlug): string {
  return SLUG_TO_LABEL[slug];
}

// The actual `projects.branch` value a slug filters to, or null for "all".
export function branchValue(slug: BranchSlug): Branch | null {
  if (slug === "all") return null;
  return SLUG_TO_LABEL[slug] as Branch;
}

export function branchSlug(branch: Branch): BranchSlug {
  return branch.toLowerCase() as BranchSlug;
}

// re-export so callers only need one import for tab-building
export { BRANCHES };
