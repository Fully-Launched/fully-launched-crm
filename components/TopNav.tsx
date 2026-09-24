"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRANCH_SLUGS, branchLabel } from "@/lib/branches";

export default function TopNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const tabs = [
    { label: "Dashboard", href: "/dashboard" },
    ...BRANCH_SLUGS.map((slug) => ({
      label: branchLabel(slug),
      href: `/projects/${slug}`,
    })),
    { label: "Leads", href: "/leads" },
    { label: "Contacts", href: "/contacts" },
    ...(isAdmin
      ? [
          { label: "Transactions", href: "/transactions" },
          { label: "Team", href: "/team" },
        ]
      : []),
  ];

  function isActive(href: string) {
    return href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(href);
  }

  // No tab is active on e.g. /project/[id]; the mobile bar falls back to "Menu".
  const activeLabel = tabs.find((t) => isActive(t.href))?.label ?? "Menu";

  // Close the mobile menu after navigating (incl. back/forward), and on
  // Escape. Links also close it on tap, which covers tapping the current tab.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <nav className="relative z-30 bg-header">
      {/* Desktop (sm and up): a row of tabs, wrapping if it runs out of room. */}
      <div className="mx-auto hidden max-w-6xl flex-wrap items-center gap-1 px-4 sm:flex">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`border-b-2 px-4 py-3 text-sm font-medium text-header-foreground transition-opacity ${
              isActive(tab.href)
                ? "border-accent opacity-100"
                : "border-transparent opacity-70 hover:opacity-100"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Mobile (below sm): current tab + hamburger that opens a dropdown
          list over the page content. */}
      <div className="relative z-10 flex items-center justify-between bg-header px-4 sm:hidden">
        <span className="py-3 text-sm font-medium text-header-foreground">
          {activeLabel}
        </span>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav-menu"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          className="-mr-2 flex h-11 w-11 items-center justify-center rounded-md text-header-foreground"
        >
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
          >
            {menuOpen ? (
              <path d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <>
          {/* Tap-outside-to-close backdrop: over the page, under the bar and
              menu (both z-10 within the nav). */}
          <div
            className="fixed inset-0 bg-black/30 sm:hidden"
            onClick={() => setMenuOpen(false)}
            aria-hidden
          />
          <div
            id="mobile-nav-menu"
            className="absolute inset-x-0 top-full z-10 border-t border-white/10 bg-header pb-2 shadow-lg sm:hidden"
          >
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                onClick={() => setMenuOpen(false)}
                className={`block border-l-4 px-4 py-3 text-sm font-medium text-header-foreground ${
                  isActive(tab.href)
                    ? "border-accent opacity-100"
                    : "border-transparent opacity-70"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </>
      )}
    </nav>
  );
}
