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

function getNextFinancialYear(currentFY: string): string {
  const [year] = currentFY.split("-");
  const yearNum = parseInt(year) + 1;
  return `${yearNum}-${String(yearNum + 1).slice(-2)}`;
}

export default function SearchStudentsPage() {
  const session = useSession();
  const [q, setQ] = useState("");
  const [peteId, setPeteId] = useState("");
  const [petes, setPetes] = useState<Pete[]>([]);
  const [results, setResults] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/petes").then((r) => r.json()).then(setPetes);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (peteId) params.set("pete_id", peteId);
      fetch(`/api/students?${params}`)
        .then((r) => r.json())
        .then((data) => {
          setResults(data);
          setLoading(false);
        });
    }, 300);
    return () => clearTimeout(t);
  }, [q, peteId]);

  return (
    <div>
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
                const nextFY = getNextFinancialYear(s.financial_year);
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
                      <Link
                        href={`/students/renew?student_id=${s.id}&next_year=${encodeURIComponent(nextFY)}`}
                        className="text-xs font-bold text-maroon-700 hover:underline whitespace-nowrap"
                      >
                        Renew →
                      </Link>
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
