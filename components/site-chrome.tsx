"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { APP_NAME } from "@/lib/brand";

const NAV = [
  { href: "/search", label: "Source Search", match: (p: string) => p.startsWith("/search") || p.startsWith("/sources") },
  { href: "/document", label: "Document", match: (p: string) => p.startsWith("/document") },
  { href: "/changes", label: "Changes", match: (p: string) => p.startsWith("/changes") },
] as const;

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex h-12 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-6">
            <Link href="/search" className="pressable shrink-0 text-[15px] font-semibold tracking-tight text-ink">
              {APP_NAME}
            </Link>
            <nav className="flex items-center gap-5 text-[13px]" aria-label="Primary">
              {NAV.map((item) => {
                const active = item.match(pathname);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`pressable border-b-2 py-1.5 transition-colors ${
                      active ? "border-accent text-ink" : "border-transparent text-ink-muted hover:text-ink"
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
