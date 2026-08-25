// Category badge colors are fixed regardless of brand palette (functional,
// not brand). Brand colors themselves live in app/globals.css CSS variables
// and tailwind.config.ts — never hardcode brand colors in components.

export type Category = "Media" | "Websites" | "Marketplace" | "AI";

export const CATEGORIES: Category[] = ["Media", "Websites", "Marketplace", "AI"];

export const CATEGORY_COLORS: Record<Category, string> = {
  Media: "bg-blue-100 text-blue-800 border border-blue-300",
  Websites: "bg-yellow-100 text-yellow-800 border border-yellow-300",
  Marketplace: "bg-red-100 text-red-800 border border-red-300",
  AI: "bg-green-100 text-green-800 border border-green-300",
};
