"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pete } from "@/components/StudentForm";
import { useSession } from "@/lib/useSession";

type StudentRow = {
  id: number;
  student_id: string;
  name: string;
  aadhar: string;
  mobile: string;
  pete_name: string;
  current_class: string;
  category: string;
  status: string;
  closed: boolean;
  financial_year: string;
};

function StatusBadge({ status, closed }: { status: string; closed: boolean }) {
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

export default function SearchStudentsPage() {
  const session = useSession();
  const [q, setQ] = useState("");
  const [peteId, setPeteId] = useState("");
  const [petes, setPetes] = useState<Pete[]>([]);
  const [results, setResults] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentYear, setCurrentYear] = useState("");
  const [renewalYear, setRenewalYear] = useState("");
  const [selectedYear, setSelectedYear] = useState("");

  useEffect(() => {
    fetch("/api/petes").then((r) => r.json()).then(setPetes);
    // Only the configured current year (and the open renewal year, if any)
    // are ever selectable — old financial years are not offered.
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setCurrentYear(data.current_academic_year || "");
        setRenewalYear(data.renewal_year || "");
        setSelectedYear(data.current_academic_year || "");
      })
      .catch(() => {});
  }, []);

  const availableYears = [currentYear, renewalYear].filter(Boolean);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (peteId) params.set("pete_id", peteId);
      if (selectedYear) params.set("financial_year", selectedYear);
      fetch(`/api/students?${params}`)
        .then((r) => r.json())
        .then((data) => {
          setResults(data);
          setLoading(false);
        });
    }, 300);
    return () => clearTimeout(t);
  }, [q, peteId, selectedYear]);

  return (
    <div>
      <div className="mb-4 flex items-center gap-3 rounded-lg bg-blue-50 px-4 py-3 ring-1 ring-blue-200">
        <span className="text-sm font-semibold text-blue-900">Current Academic Year:</span>
        <span className="text-lg font-bold text-blue-700">{currentYear || "—"}</span>
      </div>

      <h1 className="page-title">Search Students</h1>
      <p className="page-subtitle">
        Search by Aadhar number, Student ID (e.g. MJS/26/0001) or name. Open a student to renew them
        for a new financial year.
      </p>

      <div className="mt-5 mb-5 flex flex-wrap gap-3">
        <div className="relative w-full max-w-xl">
          <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-stone-400">
            🔍
          </span>
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Aadhar number, Student ID or Name…"
            className="input py-3 pl-11"
          />
        </div>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="input w-auto py-3"
        >
          {availableYears.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
        {session?.role === "super_admin" && (
          <select
            value={peteId}
            onChange={(e) => setPeteId(e.target.value)}
            className="input w-auto py-3"
          >
            <option value="">All Petes</option>
            {petes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Student ID</th>
              <th>Name</th>
              <th>Aadhar</th>
              <th>Mobile</th>
              <th>Pete</th>
              <th>Latest Class</th>
              <th>FY</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="py-10 text-center text-stone-400">
                  Searching…
                </td>
              </tr>
            ) : results.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-10 text-center text-stone-400">
                  No students found.
                </td>
              </tr>
            ) : (
              results.map((s) => {
                const canRenew =
                  !!renewalYear &&
                  s.financial_year === currentYear &&
                  ["Approved", "Closed"].includes(s.status);
                return (
                  <tr key={s.id}>
                    <td>
                      <Link
                        href={`/students/${s.id}`}
                        className="font-mono text-[13px] font-bold text-maroon-700 hover:underline"
                      >
                        {s.student_id}
                      </Link>
                    </td>
                    <td className="font-medium">{s.name}</td>
                    <td className="font-mono text-xs text-stone-500">{s.aadhar}</td>
                    <td>{s.mobile}</td>
                    <td>{s.pete_name}</td>
                    <td>{s.current_class}</td>
                    <td>{s.financial_year}</td>
                    <td>
                      <StatusBadge status={s.status} closed={s.closed} />
                    </td>
                    <td className="text-right print:hidden">
                      {canRenew ? (
                        <Link
                          href={`/students/renew?student_id=${s.id}`}
                          className="text-xs font-bold text-maroon-700 hover:underline whitespace-nowrap"
                        >
                          Renew →
                        </Link>
                      ) : (
                        <span
                          title={
                            !renewalYear
                              ? "Renewals are not open yet — the super admin must open the next financial year in Settings"
                              : `The ${currentYear} application must be Approved before renewal`
                          }
                          className="cursor-not-allowed text-xs font-bold whitespace-nowrap text-stone-300"
                        >
                          Renew →
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
