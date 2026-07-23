import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Inter, Marcellus } from "next/font/google";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { petes } from "@/lib/schema";
import LogoutButton from "@/components/LogoutButton";
import NavLinks, { NavItem } from "@/components/NavLinks";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const marcellus = Marcellus({ weight: "400", subsets: ["latin"], variable: "--font-marcellus" });

export const metadata: Metadata = {
  title: "Scholarship Portal — Srimath Anantheshwar Temple, Manjeshwar",
  description:
    "Student scholarship management for Srimath Anantheshwar Temple, Manjeshwar (Kerala)",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  let peteName: string | null = null;
  if (session?.peteId) {
    const [pete] = await db.select().from(petes).where(eq(petes.id, session.peteId));
    peteName = pete?.name ?? null;
  }

  const nav: NavItem[] = session
    ? [
        { href: "/", label: "Dashboard", icon: "🏠" },
        { href: "/students/new", label: "New Application", icon: "📝" },
        { href: "/students", label: "Search Students", icon: "🔍" },
        { href: "/students/renew", label: "Renew Student", icon: "🔄" },
        ...(session.role === "super_admin" ? [{ href: "/petes", label: "Petes", icon: "🛕" }] : []),
        { href: "/reports", label: "Reports", icon: "📊" },
        { href: "/form", label: "Blank Form", icon: "🖨️" },
        ...(session.role === "super_admin"
          ? [
              { href: "/admin/users", label: "User Access", icon: "🔐" },
              { href: "/admin/rates", label: "Scholarship Rates", icon: "💰" },
            ]
          : []),
      ]
    : [];

  return (
    <html lang="en" className={`${inter.variable} ${marcellus.variable}`}>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        {session && (
          <header className="print:hidden sticky top-0 z-40 shadow-[0_4px_20px_-4px_rgba(61,10,11,0.4)]">
            <div className="bg-gradient-to-b from-maroon-800 via-maroon-900 to-maroon-950 text-white">
              <div className="mx-auto max-w-6xl px-4">
                <div className="flex items-center justify-between gap-4 py-3">
                  <Link href="/" className="flex min-w-0 items-center gap-3">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white shadow-[0_0_0_2px_rgba(212,175,55,0.55),0_2px_10px_rgba(0,0,0,0.35)]">
                      <Image
                        src="/logo.png"
                        alt="Srimath Anantheshwar Temple logo"
                        width={44}
                        height={44}
                        className="h-11 w-11 rounded-full object-contain"
                        priority
                        unoptimized
                      />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-display text-lg leading-tight tracking-wide text-cream-50">
                        Srimath Anantheshwar Temple
                      </span>
                      <span className="block text-[11px] font-medium tracking-[0.22em] text-gold-300 uppercase">
                        Scholarship Portal · Manjeshwar
                      </span>
                    </span>
                  </Link>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="hidden items-center gap-2 rounded-full border border-white/15 bg-white/10 py-1.5 pr-3.5 pl-1.5 text-xs sm:flex">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-gold-400 font-bold text-maroon-950 uppercase">
                        {session.username.charAt(0)}
                      </span>
                      <span className="font-semibold text-cream-50">{session.username}</span>
                      <span className="text-gold-300">
                        {session.role === "super_admin"
                          ? "Super Admin"
                          : peteName
                            ? `${peteName} Pete`
                            : "Pete Admin"}
                      </span>
                    </span>
                    <LogoutButton />
                  </div>
                </div>
                <NavLinks items={nav} />
              </div>
            </div>
            <div className="gold-line" />
          </header>
        )}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 print:max-w-none print:p-0">
          {children}
        </main>
        {session && (
          <footer className="print:hidden border-t border-cream-300/70 py-5 text-center text-xs text-stone-400">
            <p className="font-display tracking-wide text-maroon-800/70">
              ॥ विद्या ददाति विनयम् ॥
            </p>
            <p className="mt-1">
              Srimath Anantheshwar Temple, Manjeshwar (Kerala) · Ph: 04998-272221 ·
              samjstemple@gmail.com
            </p>
          </footer>
        )}
      </body>
    </html>
  );
}
