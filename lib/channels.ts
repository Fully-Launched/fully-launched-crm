import type { Branch } from "@/lib/theme";
import type { Project } from "@/lib/types";

// How projects.channels (text[], migration 008) is edited, per branch. Every
// branch stores into the same array column — the input type is presentation
// only. There's no DB check on the values, so these lists are the single
// place to add/remove options.
export type ChannelInput =
  | { kind: "multi"; options: string[] }
  | { kind: "single"; options: string[] }
  | { kind: "tags" };

export const CHANNEL_INPUTS: Record<Branch, ChannelInput> = {
  Ecommerce: {
    kind: "multi",
    options: ["Faire", "Shopify", "Etsy", "TikTok Shop", "Amazon", "Walmart", "eBay"],
  },
  Media: {
    kind: "multi",
    options: ["TikTok", "Instagram", "LinkedIn", "Facebook", "YouTube", "Pinterest"],
  },
  Websites: {
    kind: "single",
    options: ["Custom", "WordPress", "Shopify", "Squarespace", "Wix"],
  },
  AI: { kind: "tags" },
};

// Patch for a branch change. Channels are branch-specific, so switching
// branch clears them (a Media project's "TikTok" isn't a valid Ecommerce
// channel). Re-selecting the same branch leaves them alone.
export function branchChangePatch(
  project: Pick<Project, "branch">,
  branch: Branch
): Partial<Project> {
  return branch === project.branch ? { branch } : { branch, channels: null };
}
