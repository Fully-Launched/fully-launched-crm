import { notFound } from "next/navigation";
import { isCategorySlug, categoryLabel, type CategorySlug } from "@/lib/categories";
import { CATEGORY_COLORS, type Category } from "@/lib/theme";

export default function ClientsPage({
  params,
}: {
  params: { category: string };
}) {
  if (!isCategorySlug(params.category)) {
    notFound();
  }

  const slug = params.category as CategorySlug;
  const label = categoryLabel(slug);

  return (
    <div className="p-8">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold text-foreground">{label}</h1>
        {slug !== "all" && (
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              CATEGORY_COLORS[label as Category]
            }`}
          >
            {label}
          </span>
        )}
      </div>
      <p className="mt-2 text-neutral-600">
        Table and Kanban views for this category are coming next.
      </p>
    </div>
  );
}
