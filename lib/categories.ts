import { CATEGORIES, type Category } from "@/lib/theme";

// URL-safe slugs for category tabs/routes (/clients/[category]).
export type CategorySlug = "all" | "media" | "websites" | "marketplace" | "ai";

export const CATEGORY_SLUGS: CategorySlug[] = [
  "all",
  "media",
  "websites",
  "marketplace",
  "ai",
];

const SLUG_TO_LABEL: Record<CategorySlug, string> = {
  all: "All",
  media: "Media",
  websites: "Websites",
  marketplace: "Marketplace",
  ai: "AI",
};

export function isCategorySlug(value: string): value is CategorySlug {
  return (CATEGORY_SLUGS as string[]).includes(value);
}

export function categoryLabel(slug: CategorySlug): string {
  return SLUG_TO_LABEL[slug];
}

// The actual `clients.category` value a slug filters to, or null for "all".
export function categoryValue(slug: CategorySlug): Category | null {
  if (slug === "all") return null;
  return SLUG_TO_LABEL[slug] as Category;
}

export function categorySlug(category: Category): CategorySlug {
  return category.toLowerCase() as CategorySlug;
}

// re-export so callers only need one import for tab-building
export { CATEGORIES };
