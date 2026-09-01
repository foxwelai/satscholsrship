"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Where "back" goes from each top-level screen. Nested student and
// application routes are derived below instead of being listed one by one.
const PARENTS: Record<string, string> = {
  "/students": "/",
  "/students/new": "/",
  "/reports": "/",
  "/form": "/",
  "/applications": "/",
  "/admin/applications": "/",
  "/admin/settings": "/",
  // These three moved under Settings when the nav bar was trimmed, so back
  // returns to the hub they are now reached from.
  "/admin/users": "/admin/settings",
  "/admin/rates": "/admin/settings",
  "/petes": "/admin/settings",
};

const LABELS: Record<string, string> = {
  "/": "Dashboard",
  "/students": "Students",
  "/admin/settings": "Settings",
};

// A real destination rather than history.back(): the first page after signing
// in has the login screen behind it, and going "back" to that is never what
// anyone means.
export function parentOf(pathname: string): string {
  const explicit = PARENTS[pathname];
  if (explicit) return explicit;

  // /students/12/applications/34 and .../applications/new → the student
  const nested = pathname.match(/^(\/students\/\d+)\/(?:applications\/[^/]+|print)$/);
  if (nested) return nested[1];

  if (/^\/students\/\d+$/.test(pathname)) return "/students";

  const trimmed = pathname.replace(/\/[^/]+$/, "");
  return trimmed || "/";
}

export default function BackLink() {
  const pathname = usePathname();
  if (pathname === "/" || pathname === "/login") return null;

  const parent = parentOf(pathname);
  const label = LABELS[parent]
    ? `Back to ${LABELS[parent]}`
    : /^\/students\/\d+$/.test(parent)
      ? "Back to Student"
      : "Back";

  return (
    <Link
      href={parent}
      className="print:hidden mb-4 inline-flex items-center gap-1.5 rounded-lg border border-cream-300 bg-white px-3 py-1.5 text-[13px] font-semibold text-maroon-800 shadow-sm transition hover:bg-maroon-50"
    >
      <span aria-hidden>←</span>
      {label}
    </Link>
  );
}
