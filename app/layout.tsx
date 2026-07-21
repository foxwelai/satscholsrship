import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { petes } from "@/lib/schema";
import LogoutButton from "@/components/LogoutButton";
import "./globals.css";

export const metadata: Metadata = {
  title: "SAT Scholarship Portal — Shrimath Ananteshwar Temple, Manjeshwar",
  description: "Student scholarship management for Shrimath Ananteshwar Temple, Manjeshwar (Kerala)",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  let peteName: string | null = null;
  if (session?.peteId) {
    const [pete] = await db.select().from(petes).where(eq(petes.id, session.peteId));
    peteName = pete?.name ?? null;
  }

  const nav = session
    ? [
        { href: "/", label: "Dashboard" },
        { href: "/students/new", label: "New Application" },
        { href: "/students", label: "Search Students" },
        ...(session.role === "super_admin" ? [{ href: "/petes", label: "Petes" }] : []),
        { href: "/reports", label: "Reports" },
        { href: "/form", label: "Print Blank Form" },
        ...(session.role === "super_admin" ? [{ href: "/admin/users", label: "User Access" }] : []),
      ]
    : [];

  return (
    <html lang="en">
      <body className="min-h-screen bg-amber-50/40 text-gray-900 antialiased">
        {session && (
          <header className="print:hidden bg-red-900 text-white shadow-md">
            <div className="mx-auto max-w-6xl px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">🛕</div>
                  <div>
                    <h1 className="text-lg font-bold leading-tight">
                      Shrimath Ananteshwar Temple, Manjeshwar
                    </h1>
                    <p className="text-xs text-red-200">Student Scholarship Management Portal</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm text-red-100">
                  <span>
                    {session.username}{" "}
                    <span className="text-red-300">
                      ({session.role === "super_admin" ? "Super Admin" : peteName ? `${peteName} Pete` : "Pete Admin"})
                    </span>
                  </span>
                  <LogoutButton />
                </div>
              </div>
              <nav className="mt-3 flex flex-wrap gap-1 text-sm">
                {nav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded px-3 py-1.5 font-medium text-red-100 hover:bg-red-800 hover:text-white"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>
        )}
        <main className="mx-auto max-w-6xl px-4 py-6 print:max-w-none print:p-0">{children}</main>
      </body>
    </html>
  );
}
