"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRANCH_SLUGS, branchLabel } from "@/lib/branches";

export default function TopNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  const tabs = [
    { label: "Dashboard", href: "/dashboard" },
    ...BRANCH_SLUGS.map((slug) => ({
      label: branchLabel(slug),
      href: `/projects/${slug}`,
    })),
    { label: "Leads", href: "/leads" },
    { label: "Contacts", href: "/contacts" },
    ...(isAdmin ? [{ label: "Transactions", href: "/transactions" }] : []),
  ];

  return (
    <nav className="bg-header">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-1 px-4">
        {tabs.map((tab) => {
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
