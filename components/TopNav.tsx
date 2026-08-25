"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CATEGORY_SLUGS, categoryLabel } from "@/lib/categories";

const TABS = [
  { label: "Dashboard", href: "/dashboard" },
  ...CATEGORY_SLUGS.map((slug) => ({
    label: categoryLabel(slug),
    href: `/clients/${slug}`,
  })),
];

export default function TopNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-header">
      <div className="mx-auto flex max-w-6xl items-center gap-1 px-4">
        {TABS.map((tab) => {
          const isActive =
            tab.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`border-b-2 px-4 py-3 text-sm font-medium text-header-foreground transition-opacity ${
                isActive
                  ? "border-accent opacity-100"
                  : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
