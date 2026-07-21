"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { APPLICATION_STATUSES } from "@/lib/constants";

type SummaryRow = { grp: string; total: number; approved: number; applied: number; rejected: number; closed: number };
type StudentRow = {
  id: number;
  application_id: number;
  student_id: string;
  name: string;
  current_class: string;
  category: string;
  bank_name: string;
  bank_branch: string;
  ifsc: string;
  status: string;
  closed: boolean;
  financial_year: string;
  pete_name: string;
  grp: string;
};

const REPORT_TYPES = [
  { key: "pete", label: "By Pete" },
  { key: "bank", label: "By Bank" },
  { key: "class", label: "By Class" },
  { key: "category", label: "By Category" },
];

export default function ReportsPage() {
  const [type, setType] = useState("pete");
  const [status, setStatus] = useState("");
  const [financialYear, setFinancialYear] = useState("");
  const [data, setData] = useState<{ summary: SummaryRow[]; students: StudentRow[]; years: string[] }>();
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({ type });
    if (status) params.set("status", status);
    if (financialYear) params.set("financial_year", financialYear);
    fetch(`/api/reports?${params}`).then((r) => r.json()).then(setData);
  }, [type, status, financialYear]);

  function exportCsv() {
    if (!data) return;
    const header = "Group,Student ID,Name,Pete,Class,Category,Bank,Branch,IFSC,Status,Closed,Financial Year";
    const rows = data.students.map((s) =>
      [s.grp, s.student_id, s.name, s.pete_name, s.current_class, s.category, s.bank_name, s.bank_branch, s.ifsc, s.status, s.closed ? "Yes" : "No", s.financial_year]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(",")
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `scholarship-report-${type}${financialYear ? "-" + financialYear : ""}.csv`;
    a.click();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-red-900">Reports</h1>
        <div className="flex gap-2 print:hidden">
          <button
            onClick={exportCsv}
            className="rounded border-2 border-red-800 px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-50"
          >
            ⬇️ Export CSV
          </button>
          <button
            onClick={() => window.print()}
            className="rounded bg-red-800 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            🖨️ Print
          </button>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-3 print:hidden">
        <div className="flex rounded-lg border-2 border-red-800 bg-white p-0.5">
          {REPORT_TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => setType(t.key)}
              className={`rounded-md px-4 py-1.5 text-sm font-semibold ${
                type === t.key ? "bg-red-800 text-white" : "text-red-800 hover:bg-red-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded border-2 border-red-300 px-3 py-1.5 text-sm focus:border-red-700 focus:outline-none"
        >
          <option value="">All Statuses</option>
          {APPLICATION_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          value={financialYear}
          onChange={(e) => setFinancialYear(e.target.value)}
          className="rounded border-2 border-red-300 px-3 py-1.5 text-sm focus:border-red-700 focus:outline-none"
        >
          <option value="">All Financial Years</option>
          {data?.years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {!data ? (
        <p className="text-gray-500">Loading…</p>
      ) : data.summary.length === 0 ? (
        <p className="rounded-lg bg-white p-6 text-center text-gray-500 shadow">
          No data for the selected filters.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-lg bg-white shadow">
            <table className="w-full text-sm">
              <thead className="bg-red-900 text-left text-white">
                <tr>
                  <th className="px-3 py-2.5">{REPORT_TYPES.find((t) => t.key === type)?.label.replace("By ", "")}</th>
                  <th className="px-3 py-2.5 text-right">Total</th>
                  <th className="px-3 py-2.5 text-right">Approved</th>
                  <th className="px-3 py-2.5 text-right">Applied</th>
                  <th className="px-3 py-2.5 text-right">Rejected</th>
                  <th className="px-3 py-2.5 text-right">Closed</th>
                  <th className="px-3 py-2.5 print:hidden"></th>
                </tr>
              </thead>
              <tbody>
                {data.summary.map((row) => (
                  <tr key={row.grp} className="border-b last:border-0 hover:bg-amber-50">
                    <td className="px-3 py-2 font-semibold">{row.grp}</td>
                    <td className="px-3 py-2 text-right font-bold">{row.total}</td>
                    <td className="px-3 py-2 text-right text-green-700">{row.approved}</td>
                    <td className="px-3 py-2 text-right text-amber-700">{row.applied}</td>
                    <td className="px-3 py-2 text-right text-red-700">{row.rejected}</td>
                    <td className="px-3 py-2 text-right text-blue-700">{row.closed}</td>
                    <td className="px-3 py-2 text-right print:hidden">
                      <button
                        onClick={() => setExpanded(expanded === row.grp ? null : row.grp)}
                        className="text-xs font-semibold text-blue-800 hover:underline"
                      >
                        {expanded === row.grp ? "Hide students" : "Show students"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {expanded !== null && (
            <div className="overflow-x-auto rounded-lg border-2 border-blue-200 bg-white shadow">
              <p className="bg-blue-50 px-3 py-2 text-sm font-bold text-blue-900">
                Students — {expanded}
              </p>
              <table className="w-full text-sm">
                <thead className="border-b text-left text-gray-600">
                  <tr>
                    <th className="px-3 py-2">Student ID</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Pete</th>
                    <th className="px-3 py-2">Class</th>
                    <th className="px-3 py-2">Bank / Branch</th>
                    <th className="px-3 py-2">IFSC</th>
                    <th className="px-3 py-2">FY</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.students
                    .filter((s) => s.grp === expanded)
                    .map((s) => (
                      <tr key={s.application_id} className="border-b last:border-0 hover:bg-amber-50">
                        <td className="px-3 py-1.5">
                          <Link href={`/students/${s.id}`} className="font-semibold text-red-800 hover:underline">
                            {s.student_id}
                          </Link>
                        </td>
                        <td className="px-3 py-1.5">{s.name}</td>
                        <td className="px-3 py-1.5">{s.pete_name}</td>
                        <td className="px-3 py-1.5">{s.current_class}</td>
                        <td className="px-3 py-1.5">
                          {[s.bank_name, s.bank_branch].filter(Boolean).join(", ")}
                        </td>
                        <td className="px-3 py-1.5 font-mono text-xs">{s.ifsc}</td>
                        <td className="px-3 py-1.5">{s.financial_year}</td>
                        <td className="px-3 py-1.5">
                          {s.status}
                          {s.closed ? " · Closed" : ""}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
