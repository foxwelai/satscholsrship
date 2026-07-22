"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { APPLICATION_STATUSES } from "@/lib/constants";

type SummaryRow = {
  grp: string;
  total: number;
  approved: number;
  applied: number;
  rejected: number;
  closed: number;
  total_amount: number;
};
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
  scholarship_amount: number;
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
    const header = "Group,Student ID,Name,Pete,Class,Category,Bank,Branch,IFSC,Status,Closed,Scholarship Amount,Financial Year";
    const rows = data.students.map((s) =>
      [s.grp, s.student_id, s.name, s.pete_name, s.current_class, s.category, s.bank_name, s.bank_branch, s.ifsc, s.status, s.closed ? "Yes" : "No", s.scholarship_amount, s.financial_year]
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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Selection summaries by pete, bank, class and category.</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <button onClick={exportCsv} className="btn-secondary">
            ⬇️ Export CSV
          </button>
          <button onClick={() => window.print()} className="btn-primary">
            🖨️ Print
          </button>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-3 print:hidden">
        <div className="flex rounded-xl border border-cream-300 bg-white p-1 shadow-sm">
          {REPORT_TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => setType(t.key)}
              className={`cursor-pointer rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
                type === t.key
                  ? "bg-gradient-to-b from-maroon-700 to-maroon-800 text-white shadow-sm"
                  : "text-maroon-800 hover:bg-maroon-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="input w-auto"
        >
          <option value="">All Statuses</option>
          {APPLICATION_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          value={financialYear}
          onChange={(e) => setFinancialYear(e.target.value)}
          className="input w-auto"
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
        <p className="text-stone-400">Loading…</p>
      ) : data.summary.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-4xl">🪔</p>
          <p className="mt-3 text-sm text-stone-500">No data for the selected filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>{REPORT_TYPES.find((t) => t.key === type)?.label.replace("By ", "")}</th>
                  <th className="text-right!">Total</th>
                  <th className="text-right!">Approved</th>
                  <th className="text-right!">Applied</th>
                  <th className="text-right!">Rejected</th>
                  <th className="text-right!">Closed</th>
                  <th className="text-right!">Total Amount (₹)</th>
                  <th className="print:hidden"></th>
                </tr>
              </thead>
              <tbody>
                {data.summary.map((row) => (
                  <tr key={row.grp}>
                    <td className="font-semibold text-maroon-900">{row.grp}</td>
                    <td className="text-right font-bold">{row.total}</td>
                    <td className="text-right font-semibold text-emerald-700">{row.approved}</td>
                    <td className="text-right font-semibold text-gold-600">{row.applied}</td>
                    <td className="text-right font-semibold text-red-700">{row.rejected}</td>
                    <td className="text-right font-semibold text-navy-700">{row.closed}</td>
                    <td className="text-right font-bold text-navy-800">
                      ₹{row.total_amount.toLocaleString("en-IN")}
                    </td>
                    <td className="text-right print:hidden">
                      <button
                        onClick={() => setExpanded(expanded === row.grp ? null : row.grp)}
                        className="cursor-pointer text-xs font-bold whitespace-nowrap text-navy-700 hover:underline"
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
            <div className="card overflow-hidden">
              <p className="border-b border-cream-200 bg-gradient-to-r from-navy-100/70 to-transparent px-5 py-3 font-display text-sm tracking-wide text-navy-800">
                Students — {expanded}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-cream-200 text-left text-[11px] font-bold tracking-wider text-stone-400 uppercase">
                      <th className="px-5 py-2.5">Student ID</th>
                      <th className="py-2.5 pr-4">Name</th>
                      <th className="py-2.5 pr-4">Pete</th>
                      <th className="py-2.5 pr-4">Class</th>
                      <th className="py-2.5 pr-4">Bank / Branch</th>
                      <th className="py-2.5 pr-4">IFSC</th>
                      <th className="py-2.5 pr-4">FY</th>
                      <th className="py-2.5 pr-4">Scholarship</th>
                      <th className="py-2.5 pr-5">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.students
                      .filter((s) => s.grp === expanded)
                      .map((s) => (
                        <tr
                          key={s.application_id}
                          className="border-b border-cream-200/70 last:border-0 hover:bg-gold-100/30"
                        >
                          <td className="px-5 py-2">
                            <Link
                              href={`/students/${s.id}`}
                              className="font-mono text-[13px] font-bold text-maroon-700 hover:underline"
                            >
                              {s.student_id}
                            </Link>
                          </td>
                          <td className="py-2 pr-4 font-medium">{s.name}</td>
                          <td className="py-2 pr-4">{s.pete_name}</td>
                          <td className="py-2 pr-4">{s.current_class}</td>
                          <td className="py-2 pr-4">
                            {[s.bank_name, s.bank_branch].filter(Boolean).join(", ")}
                          </td>
                          <td className="py-2 pr-4 font-mono text-xs">{s.ifsc}</td>
                          <td className="py-2 pr-4">{s.financial_year}</td>
                          <td className="py-2 pr-4 font-semibold text-navy-800">
                            ₹{s.scholarship_amount}
                          </td>
                          <td className="py-2 pr-5 text-xs font-semibold">
                            {s.status}
                            {s.closed ? " · Closed" : ""}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
