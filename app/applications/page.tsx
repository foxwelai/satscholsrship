import Link from "next/link";
import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { students, petes, applications, scholarshipRates } from "@/lib/schema";
import { getSession } from "@/lib/auth";
import { APPLICATION_STATUSES } from "@/lib/constants";

export const dynamic = "force-dynamic";

const PER_PAGE = 25;

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

// Preserves the other filters when one of them changes, and drops the page so
// a narrowed filter never lands you past the end of the new result set.
function href(current: { status: string; fy: string; page: number }, patch: Record<string, string | number>) {
  const params = new URLSearchParams();
  const merged = { status: current.status, fy: current.fy, page: current.page, ...patch };
  if (merged.status) params.set("status", String(merged.status));
  if (merged.fy) params.set("fy", String(merged.fy));
  if (Number(merged.page) > 1) params.set("page", String(merged.page));
  const q = params.toString();
  return q ? `/applications?${q}` : "/applications";
}

export default async function AllApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getSession();
  if (!session) return null;

  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  // Only recognised values reach the query — anything else falls back to "all".
  const status = (APPLICATION_STATUSES as readonly string[]).includes(one(sp.status))
    ? one(sp.status)
    : "";
  const fy = /^\d{4}-\d{2}$/.test(one(sp.fy)) ? one(sp.fy) : "";
  const page = Math.max(1, Number(one(sp.page)) || 1);

  const peteScope = session.role === "pete_admin" ? eq(students.peteId, session.peteId!) : undefined;
  const filters: (SQL | undefined)[] = [peteScope];
  if (status) filters.push(eq(applications.status, status));
  if (fy) filters.push(eq(applications.financialYear, fy));
  const where = and(...filters.filter(Boolean));

  const [[counts], years, rows] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)::int`,
        amount: sql<number>`coalesce(sum(case when ${applications.status} = 'Approved' then coalesce(${scholarshipRates.amount}, 0) else 0 end), 0)::int`,
      })
      .from(applications)
      .innerJoin(students, eq(students.id, applications.studentId))
      .leftJoin(
        scholarshipRates,
        and(
          eq(scholarshipRates.financialYear, applications.financialYear),
          eq(scholarshipRates.category, applications.category)
        )
      )
      .where(where),
    db
      .selectDistinct({ fy: applications.financialYear })
      .from(applications)
      .innerJoin(students, eq(students.id, applications.studentId))
      .where(peteScope)
      .orderBy(desc(applications.financialYear)),
    db
      .select({
        id: students.id,
        application_id: applications.id,
        student_id: students.studentId,
        name: students.name,
        pete_name: petes.name,
        category: applications.category,
        current_class: applications.currentClass,
        course_name: applications.courseName,
        status: applications.status,
        closed: applications.closed,
        financial_year: applications.financialYear,
        created_at: applications.createdAt,
      })
      .from(applications)
      .innerJoin(students, eq(students.id, applications.studentId))
      .innerJoin(petes, eq(petes.id, students.peteId))
      .where(where)
      .orderBy(desc(applications.createdAt))
      .limit(PER_PAGE)
      .offset((page - 1) * PER_PAGE),
  ]);

  const total = counts?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));
  const current = { status, fy, page };
  const from = total === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const to = Math.min(page * PER_PAGE, total);

  const statusTabs = [{ key: "", label: "All" }, ...APPLICATION_STATUSES.map((s) => ({ key: s, label: s }))];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">All Applications</h1>
          <p className="page-subtitle">
            {total} application{total !== 1 ? "s" : ""}
            {status ? ` · ${status}` : ""}
            {fy ? ` · ${fy}` : ""}
            {counts?.amount ? ` · ₹${counts.amount.toLocaleString("en-IN")} approved` : ""}
          </p>
        </div>
        <Link href="/" className="btn-secondary px-3.5 py-2 text-xs">
          ← Dashboard
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-xl border border-cream-300 bg-white p-1 shadow-sm">
          {statusTabs.map((t) => (
            <Link
              key={t.key || "all"}
              href={href(current, { status: t.key, page: 1 })}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${
                status === t.key
                  ? "bg-gradient-to-b from-maroon-700 to-maroon-800 text-white shadow-sm"
                  : "text-maroon-800 hover:bg-maroon-50"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
        {years.length > 0 && (
          <div className="flex rounded-xl border border-cream-300 bg-white p-1 shadow-sm">
            <Link
              href={href(current, { fy: "", page: 1 })}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${
                fy === ""
                  ? "bg-gradient-to-b from-navy-700 to-navy-800 text-white shadow-sm"
                  : "text-navy-800 hover:bg-navy-100/60"
              }`}
            >
              All Years
            </Link>
            {years.map((y) => (
              <Link
                key={y.fy}
                href={href(current, { fy: y.fy, page: 1 })}
                className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${
                  fy === y.fy
                    ? "bg-gradient-to-b from-navy-700 to-navy-800 text-white shadow-sm"
                    : "text-navy-800 hover:bg-navy-100/60"
                }`}
              >
                {y.fy}
              </Link>
            ))}
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-4xl">🪔</p>
          <p className="mt-3 font-display text-lg text-maroon-900">No applications found</p>
          <p className="mt-1 text-sm text-stone-500">Try a different status or financial year.</p>
        </div>
      ) : (
        <>
          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Name</th>
                  <th>Pete</th>
                  <th>Category</th>
                  <th>Class / Course</th>
                  <th>FY</th>
                  <th>Status</th>
                  <th>Applied</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
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
                    <td>{r.category}</td>
                    <td className="text-sm">
                      {[r.current_class, r.course_name].filter(Boolean).join(" · ")}
                    </td>
                    <td>{r.financial_year}</td>
                    <td>
                      <StatusBadge status={r.status} closed={r.closed} />
                    </td>
                    <td className="text-xs text-stone-500">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString("en-IN") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-stone-500">
              Showing {from}–{to} of {total}
            </p>
            {pageCount > 1 && (
              <div className="flex items-center gap-1.5">
                {page > 1 && (
                  <Link href={href(current, { page: page - 1 })} className="btn-secondary px-3 py-1.5 text-xs">
                    ← Prev
                  </Link>
                )}
                {Array.from({ length: pageCount }, (_, i) => i + 1)
                  // Keep the strip short on long lists: first, last and a window
                  // around the current page.
                  .filter((n) => n === 1 || n === pageCount || Math.abs(n - page) <= 2)
                  .map((n, i, arr) => (
                    <span key={n} className="flex items-center gap-1.5">
                      {i > 0 && arr[i - 1] !== n - 1 && <span className="text-xs text-stone-400">…</span>}
                      <Link
                        href={href(current, { page: n })}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                          n === page
                            ? "bg-gradient-to-b from-maroon-700 to-maroon-800 text-white shadow-sm"
                            : "border border-cream-300 bg-white text-maroon-800 hover:bg-maroon-50"
                        }`}
                      >
                        {n}
                      </Link>
                    </span>
                  ))}
                {page < pageCount && (
                  <Link href={href(current, { page: page + 1 })} className="btn-secondary px-3 py-1.5 text-xs">
                    Next →
                  </Link>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
