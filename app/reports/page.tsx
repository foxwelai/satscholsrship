"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Pete } from "@/components/StudentForm";
import { useSession } from "@/lib/useSession";

type Row = {
  id: number;
  application_id: number;
  student_id: string;
  name: string;
  pete_id: number;
  pete_name: string;
  current_class: string;
  category: string;
  course_name: string;
  bank_name: string;
  bank_branch: string;
  bank_account: string;
  ifsc: string;
  scholarship_amount: number;
  financial_year: string;
};

const BANK_GROUPS = [
  { key: "", label: "ALL" },
  { key: "ubi", label: "Union Bank of India" },
  { key: "other", label: "Other Banks" },
];

const MODES = [
  { key: "flat", label: "Consolidated" },
  { key: "bank", label: "Bank-wise" },
  { key: "branch", label: "Branch-wise" },
];

function inr(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function ReportsPage() {
  const session = useSession();
  const [petes, setPetes] = useState<Pete[]>([]);
  const [peteId, setPeteId] = useState("");
  const [financialYear, setFinancialYear] = useState("");
  const [bankGroup, setBankGroup] = useState("");
  const [mode, setMode] = useState("flat");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [years, setYears] = useState<string[]>([]);
  const [pdfBusy, setPdfBusy] = useState(false);

  const isPeteAdmin = session?.role === "pete_admin";

  useEffect(() => {
    fetch("/api/petes").then((r) => r.json()).then(setPetes);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (peteId) params.set("pete_id", peteId);
    if (financialYear) params.set("financial_year", financialYear);
    if (bankGroup) params.set("bank_group", bankGroup);
    fetch(`/api/reports?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setRows(data.students ?? []);
        setYears(data.years ?? []);
        if (!financialYear && data.years?.length) setFinancialYear(data.years[0]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peteId, financialYear, bankGroup]);

  const peteName = isPeteAdmin
    ? (session?.peteName ?? "My Pete")
    : peteId
      ? (petes.find((p) => p.id === Number(peteId))?.name ?? "")
      : "";
  const isSpecificPete = isPeteAdmin || !!peteId;

  const headerLine = `${
    isSpecificPete ? `Pete: ${peteName}` : "All Petes — Consolidated"
  }   ·   Financial Year: ${financialYear || "All Years"}${
    bankGroup ? `   ·   ${BANK_GROUPS.find((b) => b.key === bankGroup)?.label}` : ""
  }`;

  const totals = useMemo(() => {
    const list = rows ?? [];
    return {
      count: list.length,
      amount: list.reduce((sum, r) => sum + r.scholarship_amount, 0),
    };
  }, [rows]);

  // Bank-wise / branch-wise grouping with per-group subtotals.
  const groups = useMemo(() => {
    if (!rows || mode === "flat") return [];
    const map = new Map<string, Row[]>();
    for (const r of rows) {
      const bank = r.bank_name || "(No bank recorded)";
      const key = mode === "bank" ? bank : `${bank} — ${r.bank_branch || "(No branch)"}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, list]) => ({
        label,
        list,
        count: list.length,
        amount: list.reduce((s, r) => s + r.scholarship_amount, 0),
      }));
  }, [rows, mode]);

  function fileSuffix() {
    return [
      isSpecificPete ? peteName.toLowerCase().replace(/\s+/g, "-") : "all-petes",
      mode !== "flat" ? mode : "",
      financialYear,
      bankGroup === "ubi" ? "union-bank" : bankGroup === "other" ? "other-banks" : "",
    ]
      .filter(Boolean)
      .join("-");
  }

  function csvCell(v: unknown) {
    return `"${String(v ?? "").replace(/"/g, '""')}"`;
  }

  function exportCsv() {
    if (!rows) return;
    const header = [
      "Student ID", "Name", "Class / Course", "Bank", "Branch", "Account No", "IFSC", "Amount",
    ];
    const lines: string[] = [csvCell(headerLine), header.map(csvCell).join(",")];
    const rowToLine = (r: Row) =>
      [
        r.student_id,
        r.name,
        [r.current_class, r.course_name].filter(Boolean).join(" — "),
        r.bank_name,
        r.bank_branch,
        r.bank_account,
        r.ifsc,
        r.scholarship_amount,
      ].map(csvCell).join(",");

    if (mode === "flat") {
      rows.forEach((r) => lines.push(rowToLine(r)));
    } else {
      for (const g of groups) {
        lines.push(csvCell(g.label));
        g.list.forEach((r) => lines.push(rowToLine(r)));
        lines.push(csvCell(`Subtotal — ${g.count} students, Rs. ${g.amount}`));
      }
    }
    lines.push(csvCell(`TOTAL — ${totals.count} students, Rs. ${totals.amount}`));
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `scholarship-report-${fileSuffix()}.csv`;
    a.click();
  }

  async function exportPdf() {
    if (!rows || pdfBusy) return;
    setPdfBusy(true);
    try {
      const { default: JsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new JsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const maroon: [number, number, number] = [106, 20, 22];
      const navy: [number, number, number] = [30, 58, 95];

      try {
        const blob = await fetch("/logo.png").then((r) => r.blob());
        const dataUrl: string = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        doc.addImage(dataUrl, "PNG", 12, 8, 22, 22);
      } catch {
        /* logo optional */
      }

      doc.setTextColor(...maroon);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text("Srimath Anantheshwar Temple, Manjeshwar (Kerala)", pageWidth / 2, 14, { align: "center" });
      doc.setFontSize(11);
      doc.text("Student Scholarship Report (Approved Applications)", pageWidth / 2, 20, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(60);
      doc.text(headerLine.replace(/₹/g, "Rs. "), pageWidth / 2, 26, { align: "center" });
      doc.setFontSize(8);
      doc.text(
        `Generated on ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`,
        pageWidth / 2,
        30.5,
        { align: "center" }
      );

      const head = [
        ["Student ID", "Name", "Class / Course", "Bank", "Branch", "Account No", "IFSC", "Amount (Rs.)"],
      ];
      const rowToArr = (r: Row) => [
        r.student_id,
        r.name,
        [r.current_class, r.course_name].filter(Boolean).join(" — "),
        r.bank_name,
        r.bank_branch,
        r.bank_account,
        r.ifsc,
        r.scholarship_amount.toLocaleString("en-IN"),
      ];
      const amountCol = 7;
      const commonStyles = {
        styles: { fontSize: 8, cellPadding: 1.8 },
        columnStyles: { [amountCol]: { halign: "right" as const } },
      };

      let y = 35;
      if (mode === "flat") {
        autoTable(doc, {
          startY: y,
          head,
          body: rows.map(rowToArr),
          headStyles: { fillColor: maroon, fontSize: 8 },
          ...commonStyles,
        });
        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
      } else {
        for (const g of groups) {
          autoTable(doc, {
            startY: y,
            head: [[{ content: g.label, colSpan: head[0].length, styles: { fillColor: navy } }], ...head],
            body: [
              ...g.list.map(rowToArr),
              [
                {
                  content: `Subtotal — ${g.count} student${g.count !== 1 ? "s" : ""}`,
                  colSpan: amountCol,
                  styles: { fontStyle: "bold" as const },
                },
                { content: g.amount.toLocaleString("en-IN"), styles: { fontStyle: "bold" as const, halign: "right" as const } },
              ],
            ],
            headStyles: { fillColor: maroon, fontSize: 8 },
            ...commonStyles,
          });
          y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
        }
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...maroon);
      doc.text(
        `Total Students: ${totals.count}    ·    Total Amount: Rs. ${totals.amount.toLocaleString("en-IN")}`,
        pageWidth / 2,
        Math.min(y + 8, doc.internal.pageSize.getHeight() - 8),
        { align: "center" }
      );

      doc.save(`scholarship-report-${fileSuffix()}.pdf`);
    } finally {
      setPdfBusy(false);
    }
  }

  function RowCells({ r }: { r: Row }) {
    return (
      <>
        <td>
          <Link
            href={`/students/${r.id}`}
            className="font-mono text-[13px] font-bold text-maroon-700 hover:underline"
          >
            {r.student_id}
          </Link>
        </td>
        <td className="font-medium">{r.name}</td>
        <td className="text-sm">{[r.current_class, r.course_name].filter(Boolean).join(" — ")}</td>
        <td>{r.bank_name}</td>
        <td>{r.bank_branch}</td>
        <td className="font-mono text-xs">{r.bank_account}</td>
        <td className="font-mono text-xs">{r.ifsc}</td>
        <td className="text-right font-semibold text-navy-800">{inr(r.scholarship_amount)}</td>
      </>
    );
  }

  const colCount = 8;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Only approved applications appear in reports.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="btn-secondary">
            ⬇️ CSV
          </button>
          <button onClick={exportPdf} disabled={pdfBusy || !rows} className="btn-navy">
            {pdfBusy ? "Preparing…" : "📄 Download PDF"}
          </button>
          <button onClick={() => window.print()} className="btn-primary">
            🖨️ Print
          </button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3 print:hidden">
        {!isPeteAdmin && (
          <select value={peteId} onChange={(e) => setPeteId(e.target.value)} className="input w-auto">
            <option value="">All Petes — Consolidated</option>
            {petes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        <select
          value={financialYear}
          onChange={(e) => setFinancialYear(e.target.value)}
          className="input w-auto"
        >
          <option value="">All Financial Years</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <div className="flex rounded-xl border border-cream-300 bg-white p-1 shadow-sm">
          {BANK_GROUPS.map((b) => (
            <button
              key={b.key}
              onClick={() => setBankGroup(b.key)}
              className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${
                bankGroup === b.key
                  ? "bg-gradient-to-b from-navy-700 to-navy-800 text-white shadow-sm"
                  : "text-navy-800 hover:bg-navy-100/60"
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
        <div className="flex rounded-xl border border-cream-300 bg-white p-1 shadow-sm">
          {MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${
                mode === m.key
                  ? "bg-gradient-to-b from-maroon-700 to-maroon-800 text-white shadow-sm"
                  : "text-maroon-800 hover:bg-maroon-50"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Report header line — shown on screen and in print */}
      <div className="mb-4 rounded-xl border border-cream-300 bg-gradient-to-r from-maroon-50 via-cream-50 to-transparent px-5 py-3">
        <p className="font-display text-[15px] tracking-wide text-maroon-900">{headerLine}</p>
      </div>

      {!rows ? (
        <p className="text-stone-400">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-4xl">🪔</p>
          <p className="mt-3 text-sm text-stone-500">
            No approved applications for the selected filters.
          </p>
          <p className="mt-1 text-xs text-stone-400">
            Applications appear here once the super admin approves them.
          </p>
        </div>
      ) : (
        <>
          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Name</th>
                  <th>Class / Course</th>
                  <th>Bank</th>
                  <th>Branch</th>
                  <th>Account No</th>
                  <th>IFSC</th>
                  <th className="text-right!">Amount</th>
                </tr>
              </thead>
              <tbody>
                {mode === "flat"
                  ? rows.map((r) => (
                      <tr key={r.application_id}>
                        <RowCells r={r} />
                      </tr>
                    ))
                  : groups.map((g) => (
                      <React.Fragment key={g.label}>
                        <tr>
                          <td
                            colSpan={colCount}
                            className="bg-navy-100/60! py-2! font-display text-[14px] tracking-wide text-navy-900"
                          >
                            🏦 {g.label}
                          </td>
                        </tr>
                        {g.list.map((r) => (
                          <tr key={r.application_id}>
                            <RowCells r={r} />
                          </tr>
                        ))}
                        <tr>
                          <td colSpan={colCount - 1} className="text-right text-xs font-bold text-stone-500">
                            Subtotal — {g.count} student{g.count !== 1 ? "s" : ""}
                          </td>
                          <td className="text-right font-bold text-navy-800">{inr(g.amount)}</td>
                        </tr>
                      </React.Fragment>
                    ))}
              </tbody>
            </table>
          </div>

          {/* Totals BELOW the report, per requirement */}
          <div className="mt-4 flex flex-wrap items-center justify-end gap-6 rounded-xl border border-cream-300 bg-white px-6 py-4 shadow-sm">
            <p className="text-sm font-semibold text-stone-600">
              Total Students:{" "}
              <span className="font-display text-lg text-maroon-900">{totals.count}</span>
            </p>
            <p className="text-sm font-semibold text-stone-600">
              Total Amount:{" "}
              <span className="font-display text-lg text-navy-800">{inr(totals.amount)}</span>
            </p>
          </div>
        </>
      )}
    </div>
  );
}
