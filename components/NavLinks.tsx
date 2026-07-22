"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; icon: string };

export default function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  // Longest matching href wins, so /students/new highlights "New Application"
  // rather than "Search Students".
  const best = items
    .filter((i) => pathname === i.href || (i.href !== "/" && pathname.startsWith(i.href + "/")))
    .sort((a, b) => b.href.length - a.href.length)[0];

  return (
    <nav className="scrollbar-none -mb-px flex gap-1 overflow-x-auto">
      {items.map((item) => {
        const active = item.href === (best?.href ?? "/__none__");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex shrink-0 items-center gap-1.5 rounded-t-xl border-b-2 px-3.5 py-2.5 text-[13px] font-semibold transition-colors ${
              active
                ? "border-gold-400 bg-white/10 text-white"
                : "border-transparent text-cream-200/80 hover:bg-white/5 hover:text-white"
            }`}
          >
            <span aria-hidden className="text-[15px] leading-none">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
