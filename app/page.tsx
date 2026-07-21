import Link from "next/link";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { students, petes, applications } from "@/lib/schema";
import { getSession } from "@/lib/auth";
import { currentFinancialYear } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const session = await getSession();
  if (!session) return null;
  const fy = currentFinancialYear();
  const peteScope = session.role === "pete_admin" ? eq(students.peteId, session.peteId!) : undefined;

  const [totals] = await db
    .select({
      total: sql<number>`count(distinct ${students.id})::int`,
    })
    .from(students)
    .where(peteScope);

  const [thisYear] = await db
    .select({
      applied: sql<number>`count(*)::int`,
      approved: sql<number>`sum(case when ${applications.status} = 'Approved' then 1 else 0 end)::int`,
      closed: sql<number>`sum(case when ${applications.closed} then 1 else 0 end)::int`,
    })
    .from(applications)
    .innerJoin(students, eq(students.id, applications.studentId))
    .where(and(eq(applications.financialYear, fy), peteScope));

  const [peteCount] = session.role === "super_admin"
    ? await db.select({ c: sql<number>`count(*)::int` }).from(petes).where(eq(petes.active, true))
    : [{ c: 1 }];

  const recent = await db
    .select({
      id: students.id,
      application_id: applications.id,
      student_id: students.studentId,
      name: students.name,
      pete_name: petes.name,
      current_class: applications.currentClass,
      status: applications.status,
      financial_year: applications.financialYear,
    })
    .from(applications)
    .innerJoin(students, eq(students.id, applications.studentId))
    .innerJoin(petes, eq(petes.id, students.peteId))
    .where(peteScope)
    .orderBy(desc(applications.createdAt))
    .limit(8);

  const stats = [
    { label: "Total Students", value: totals?.total ?? 0, color: "bg-red-800" },
    { label: `Applications in ${fy}`, value: thisYear?.applied ?? 0, color: "bg-amber-700" },
    { label: `Approved in ${fy}`, value: thisYear?.approved ?? 0, color: "bg-green-700" },
    session.role === "super_admin"
      ? { label: "Active Petes", value: peteCount?.c ?? 0, color: "bg-blue-800" }
      : { label: `Closed in ${fy}`, value: thisYear?.closed ?? 0, color: "bg-blue-800" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className={`rounded-lg ${s.color} p-4 text-white shadow`}>
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="text-sm opacity-90">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/students/new" className="rounded-lg border-2 border-red-800 bg-white p-5 shadow hover:bg-red-50">
          <p className="text-lg font-bold text-red-900">📝 New Application</p>
          <p className="text-sm text-gray-600">Register a student and auto-generate their ID (e.g. MJS/26/0001)</p>
        </Link>
        <Link href="/students" className="rounded-lg border-2 border-red-800 bg-white p-5 shadow hover:bg-red-50">
          <p className="text-lg font-bold text-red-900">🔍 Search Students</p>
          <p className="text-sm text-gray-600">Find by Aadhar number, Student ID or name — renew for next year</p>
        </Link>
        <Link href="/reports" className="rounded-lg border-2 border-red-800 bg-white p-5 shadow hover:bg-red-50">
          <p className="text-lg font-bold text-red-900">📊 Reports</p>
          <p className="text-sm text-gray-600">Selection by pete, bank, and class / category</p>
        </Link>
      </div>

      <div className="rounded-lg bg-white p-4 shadow">
        <h2 className="mb-3 font-bold text-red-900">Recent Applications</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-gray-500">No students registered yet. Start with a new application.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-600">
                <th className="py-2">Student ID</th>
                <th>Name</th>
                <th>Pete</th>
                <th>Class</th>
                <th>Financial Year</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.application_id} className="border-b last:border-0 hover:bg-amber-50">
                  <td className="py-2">
                    <Link href={`/students/${r.id}`} className="font-semibold text-red-800 hover:underline">
                      {r.student_id}
                    </Link>
                  </td>
                  <td>{r.name}</td>
                  <td>{r.pete_name}</td>
                  <td>{r.current_class}</td>
                  <td>{r.financial_year}</td>
                  <td>{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
