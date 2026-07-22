import Link from "next/link";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { students, petes, applications } from "@/lib/schema";
import { getSession } from "@/lib/auth";
import { currentFinancialYear } from "@/lib/constants";

export const dynamic = "force-dynamic";

function StatusBadge({ status, closed }: { status: string; closed?: boolean }) {
  const cls =
    status === "Approved"
      ? "badge-green"
      : status === "Rejected"
        ? "badge-red"
        : status === "—"
          ? "badge-gray"
          : "badge-amber";
  return (
    <span className={cls}>
      {status}
      {closed ? " · Closed" : ""}
    </span>
  );
}

export default async function Dashboard() {
  const session = await getSession();
  if (!session) return null;
  const fy = currentFinancialYear();
  const peteScope = session.role === "pete_admin" ? eq(students.peteId, session.peteId!) : undefined;

  const [totals] = await db
    .select({ total: sql<number>`count(distinct ${students.id})::int` })
    .from(students)
    .where(peteScope);

  const [thisYear] = await db
    .select({
      applied: sql<number>`count(*)::int`,
      approved: sql<number>`sum(case when ${applications.status} = 'Approved' then 1 else 0 end)::int`,
      closed: sql<number>`sum(case when ${applications.closed} then 1 else 0 end)::int`,
      amount: sql<number>`coalesce(sum(case when ${applications.status} = 'Approved' then ${applications.scholarshipAmount} else 0 end), 0)::int`,
    })
    .from(applications)
    .innerJoin(students, eq(students.id, applications.studentId))
    .where(and(eq(applications.financialYear, fy), peteScope));

  const recent = await db
    .select({
      id: students.id,
      application_id: applications.id,
      student_id: students.studentId,
      name: students.name,
      pete_name: petes.name,
      current_class: applications.currentClass,
      status: applications.status,
      closed: applications.closed,
      financial_year: applications.financialYear,
    })
    .from(applications)
    .innerJoin(students, eq(students.id, applications.studentId))
    .innerJoin(petes, eq(petes.id, students.peteId))
    .where(peteScope)
    .orderBy(desc(applications.createdAt))
    .limit(8);

  const stats = [
    {
      label: "Total Students",
      value: String(totals?.total ?? 0),
      icon: "👨‍🎓",
      tone: "from-maroon-700 to-maroon-900",
    },
    {
      label: `Applications · ${fy}`,
      value: String(thisYear?.applied ?? 0),
      icon: "📋",
      tone: "from-gold-500 to-gold-700",
    },
    {
      label: `Approved · ${fy}`,
      value: String(thisYear?.approved ?? 0),
      icon: "✅",
      tone: "from-emerald-600 to-emerald-800",
    },
    {
      label: `Sanctioned · ${fy}`,
      value: `₹${(thisYear?.amount ?? 0).toLocaleString("en-IN")}`,
      icon: "💰",
      tone: "from-navy-700 to-navy-900",
    },
  ];

  const actions = [
    {
      href: "/students/new",
      icon: "📝",
      title: "New Application",
      desc: "Register a student — their ID is generated from the pete, e.g. MJS/26/0001",
    },
    {
      href: "/students",
      icon: "🔍",
      title: "Search & Renew",
      desc: "Find by Aadhar, Student ID or name, then add next year's application",
    },
    {
      href: "/reports",
      icon: "📊",
      title: "Reports",
      desc: "Selection by pete, bank and class — with CSV export and print",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">
          Namaste, <span className="capitalize">{session.username}</span> 🙏
        </h1>
        <p className="page-subtitle">
          Scholarship cycle <span className="font-semibold text-maroon-800">{fy}</span> ·{" "}
          {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card flex items-center gap-4 p-5">
            <span
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-xl shadow-inner ${s.tone}`}
            >
              <span className="drop-shadow">{s.icon}</span>
            </span>
            <div className="min-w-0">
              <p className="truncate text-2xl font-bold tracking-tight text-stone-800">{s.value}</p>
              <p className="truncate text-xs font-medium text-stone-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {actions.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="card group relative overflow-hidden p-5 transition hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-12px_rgba(61,10,11,0.25)]"
          >
            <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-maroon-700 via-gold-400 to-maroon-700 opacity-0 transition group-hover:opacity-100" />
            <div className="flex items-start gap-3.5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-maroon-50 text-xl ring-1 ring-maroon-100">
                {a.icon}
              </span>
              <div>
                <p className="font-display text-[15px] tracking-wide text-maroon-900">
                  {a.title}
                  <span className="ml-1 inline-block transition group-hover:translate-x-1">→</span>
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-stone-500">{a.desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2.5">
          <span className="accent-bar" />
          <h2 className="font-display text-lg tracking-wide text-maroon-900">Recent Applications</h2>
        </div>
        {recent.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-4xl">🪔</p>
            <p className="mt-3 font-display text-lg text-maroon-900">No applications yet</p>
            <p className="mt-1 text-sm text-stone-500">
              Start by registering a student with a new application.
            </p>
            <Link href="/students/new" className="btn-primary mt-5">
              📝 New Application
            </Link>
          </div>
        ) : (
          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Name</th>
                  <th>Pete</th>
                  <th>Class</th>
                  <th>Financial Year</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.application_id}>
                    <td>
                      <Link
                        href={`/students/${r.id}`}
                        className="font-mono text-[13px] font-bold text-maroon-700 hover:underline"
                      >
                        {r.student_id}
                      </Link>
                    </td>
                    <td className="font-medium">{r.name}</td>
                    <td>{r.pete_name}</td>
                    <td>{r.current_class}</td>
                    <td>{r.financial_year}</td>
                    <td>
                      <StatusBadge status={r.status} closed={r.closed} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
