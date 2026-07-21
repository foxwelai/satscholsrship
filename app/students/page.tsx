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
      <h1 className="mb-4 text-xl font-bold text-red-900">Search Students</h1>
      <p className="mb-4 text-sm text-gray-600">
        Search by Aadhar number, Student ID (e.g. MJS/26/0001) or name. To renew a student for a new
        financial year, open their record and use <span className="font-semibold">Add Next Year Application</span>.
      </p>
      <div className="mb-4 flex flex-wrap gap-3">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by Aadhar number, Student ID or Name…"
          className="w-full max-w-xl rounded border-2 border-red-300 px-4 py-2.5 focus:border-red-700 focus:outline-none"
        />
        {session?.role === "super_admin" && (
          <select
            value={peteId}
            onChange={(e) => setPeteId(e.target.value)}
            className="rounded border-2 border-red-300 px-3 py-2.5 focus:border-red-700 focus:outline-none"
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

      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <table className="w-full text-sm">
          <thead className="bg-red-900 text-left text-white">
            <tr>
              <th className="px-3 py-2.5">Student ID</th>
              <th className="px-3 py-2.5">Name</th>
              <th className="px-3 py-2.5">Aadhar</th>
              <th className="px-3 py-2.5">Mobile</th>
              <th className="px-3 py-2.5">Pete</th>
              <th className="px-3 py-2.5">Latest Class</th>
              <th className="px-3 py-2.5">Financial Year</th>
              <th className="px-3 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-gray-500">
                  Searching…
                </td>
              </tr>
            ) : results.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-gray-500">
                  No students found.
                </td>
              </tr>
            ) : (
              results.map((s) => (
                <tr key={s.id} className="border-b last:border-0 hover:bg-amber-50">
                  <td className="px-3 py-2">
                    <Link href={`/students/${s.id}`} className="font-semibold text-red-800 hover:underline">
                      {s.student_id}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{s.name}</td>
                  <td className="px-3 py-2 font-mono text-xs">{s.aadhar}</td>
                  <td className="px-3 py-2">{s.mobile}</td>
                  <td className="px-3 py-2">{s.pete_name}</td>
                  <td className="px-3 py-2">{s.current_class}</td>
                  <td className="px-3 py-2">{s.financial_year}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-semibold ${
                        s.status === "Approved"
                          ? "bg-green-100 text-green-800"
                          : s.status === "Rejected"
                          ? "bg-red-100 text-red-800"
                          : s.status === "—"
                          ? "bg-gray-100 text-gray-500"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {s.status}
                      {s.closed ? " · Closed" : ""}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
