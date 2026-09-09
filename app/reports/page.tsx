"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Pete } from "@/components/StudentForm";
import { CATEGORIES } from "@/lib/constants";
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
  { key: "class", label: "Class-wise" },
  { key: "summary", label: "Summary" },
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
  const [xlsxBusy, setXlsxBusy] = useState(false);

  const isPeteAdmin = session?.role === "pete_admin";

  useEffect(() => {
    fetch("/api/petes").then((r) => r.json()).then(setPetes);
  }, []);

  useEffect(() => {
    // The first load runs unfiltered while the year is still unknown, and that
    // query is several times slower than the filtered one that replaces it.
    // Dropping a stale reply keeps a slow earlier response from overwriting the
    // rows for the filter now selected — switching pete twice in quick
    // succession is the case that would otherwise show the wrong pete.
    let active = true;
    const params = new URLSearchParams();
    if (peteId) params.set("pete_id", peteId);
    if (financialYear) params.set("financial_year", financialYear);
    if (bankGroup) params.set("bank_group", bankGroup);
    fetch(`/api/reports?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        setRows(data.students ?? []);
        setYears(data.years ?? []);
        if (!financialYear && data.years?.length) setFinancialYear(data.years[0]);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
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

  // Bank-wise / class-wise grouping with per-group subtotals. Groups come from
  // the rows themselves, so only classes actually present in the data appear.
  const groups = useMemo(() => {
    if (!rows || mode === "flat") return [];
    const map = new Map<string, Row[]>();
    for (const r of rows) {
      const key =
        mode === "bank"
          ? r.bank_name || "(No bank recorded)"
          : r.category || "(No class recorded)";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    // Classes read best in syllabus order (P.U.C. → Post Graduation) rather
    // than alphabetically; banks and any unrecognised class stay alphabetical.
    const rank = (label: string) => {
      const i = (CATEGORIES as readonly string[]).indexOf(label);
      return i === -1 ? CATEGORIES.length : i;
    };
    return Array.from(map.entries())
      .sort((a, b) =>
        mode === "class" && rank(a[0]) !== rank(b[0])
          ? rank(a[0]) - rank(b[0])
          : a[0].localeCompare(b[0])
      )
      .map(([label, list]) => ({
        label,
        list,
        count: list.length,
        amount: list.reduce((s, r) => s + r.scholarship_amount, 0),
      }));
  }, [rows, mode]);

  // Pete × category headcount. Built from the same filtered rows as every other
  // mode, so it counts approved applications only, exactly like the detail
  // report it sits beside.
  const summary = useMemo(() => {
    if (!rows) return null;
    const rank = (c: string) => {
      const i = (CATEGORIES as readonly string[]).indexOf(c);
      return i === -1 ? CATEGORIES.length : i;
    };
    const categories = [...new Set(rows.map((r) => r.category || "(Not recorded)"))].sort(
      (a, b) => rank(a) - rank(b) || a.localeCompare(b)
    );
    const byPete = new Map<string, Map<string, number>>();
    for (const r of rows) {
      const pete = r.pete_name || "(No pete)";
      const cat = r.category || "(Not recorded)";
      if (!byPete.has(pete)) byPete.set(pete, new Map());
      const counts = byPete.get(pete)!;
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }
    const peteRows = [...byPete.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([pete, counts]) => ({
        pete,
        counts: categories.map((c) => counts.get(c) ?? 0),
        total: [...counts.values()].reduce((sum, n) => sum + n, 0),
      }));
    return {
      categories,
      peteRows,
      columnTotals: categories.map((_, i) =>
        peteRows.reduce((sum, r) => sum + r.counts[i], 0)
      ),
      grandTotal: peteRows.reduce((sum, r) => sum + r.total, 0),
    };
  }, [rows]);

  // Summary exports carry the matrix rather than the student rows.
  function summaryTable(): { header: string[]; body: (string | number)[][]; total: (string | number)[] } {
    const header = ["Pete", ...(summary?.categories ?? []), "Total"];
    const body = (summary?.peteRows ?? []).map((r) => [r.pete, ...r.counts, r.total]);
    const total = ["TOTAL", ...(summary?.columnTotals ?? []), summary?.grandTotal ?? 0];
    return { header, body, total };
  }

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

  // Columns shared by both exports. The screen table omits Pete and Category
  // because a filter already pins them; an exported file has to stand alone.
  const EXPORT_COLUMNS = [
    "Student ID",
    "Name",
    "Pete",
    "Category",
    "Class / Course",
    "Bank",
    "Bank Branch",
    "Account No",
    "IFSC",
    "Amount (Rs.)",
  ];
  const AMOUNT_COL = EXPORT_COLUMNS.indexOf("Amount (Rs.)");
  const ACCOUNT_COL = EXPORT_COLUMNS.indexOf("Account No");

  function exportCells(r: Row) {
    return [
      r.student_id,
      r.name,
      r.pete_name,
      r.category,
      [r.current_class, r.course_name].filter(Boolean).join(" — "),
      r.bank_name,
      r.bank_branch,
      r.bank_account,
      r.ifsc,
      r.scholarship_amount,
    ];
  }

  function csvCell(v: unknown) {
    return `"${String(v ?? "").replace(/"/g, '""')}"`;
  }

  // Excel coerces bare digit strings: a leading zero disappears and anything
  // past 15 digits is rounded off to zeros. Account numbers are written as a
  // text formula instead, which Excel and Google Sheets both render as the
  // exact digits. See the Excel export for the clean, untricked version.
  function csvTextCell(v: unknown) {
    const text = String(v ?? "");
    return text ? `="${text.replace(/"/g, '""')}"` : '""';
  }

  function exportCsv() {
    if (!rows) return;
    const blank = '""';
    const rowToLine = (r: Row) => {
      const cells = exportCells(r);
      return cells
        .map((v, i) =>
          i === AMOUNT_COL ? String(v) : i === ACCOUNT_COL ? csvTextCell(v) : csvCell(v)
        )
        .join(",");
    };
    // Totals go in the Amount column so the sheet can add them up.
    const totalLine = (label: string, amount: number) =>
      [
        csvCell(label),
        ...Array(EXPORT_COLUMNS.length - 2).fill(blank),
        String(amount),
      ].join(",");

    const lines: string[] = [csvCell(headerLine)];

    if (mode === "summary") {
      const { header, body, total } = summaryTable();
      lines.push(header.map(csvCell).join(","));
      body.forEach((r) =>
        lines.push(r.map((v, i) => (i === 0 ? csvCell(v) : String(v))).join(","))
      );
      lines.push(total.map((v, i) => (i === 0 ? csvCell(v) : String(v))).join(","));
      downloadCsv(lines);
      return;
    }

    lines.push(EXPORT_COLUMNS.map(csvCell).join(","));

    if (mode === "flat") {
      rows.forEach((r) => lines.push(rowToLine(r)));
    } else {
      for (const g of groups) {
        lines.push([csvCell(g.label), ...Array(EXPORT_COLUMNS.length - 1).fill(blank)].join(","));
        g.list.forEach((r) => lines.push(rowToLine(r)));
        lines.push(totalLine(`Subtotal — ${g.label} (${g.count} students)`, g.amount));
      }
    }
    lines.push(totalLine(`TOTAL — ${totals.count} students`, totals.amount));
    downloadCsv(lines);
  }

  function downloadBlob(blob: Blob, name: string) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `scholarship-report-${name}`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function downloadCsv(lines: string[]) {
    // BOM so Excel reads it as UTF-8 — without it the em dashes and ₹ in the
    // header line arrive as mojibake. CRLF per RFC 4180.
    const csv = "\uFEFF" + lines.join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `scholarship-report-${fileSuffix()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function exportExcel() {
    if (!rows || xlsxBusy) return;
    setXlsxBusy(true);
    try {
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      wb.creator = "Srimath Anantheshwar Temple — Scholarship Portal";
      wb.created = new Date();

      const ws = wb.addWorksheet("Scholarship Report", {
        pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
      });
      const MAROON = "FF6A1416";
      const NAVY = "FF1E3A5F";
      const last = EXPORT_COLUMNS.length;

      function titleRow(text: string, size: number, bold: boolean) {
        const row = ws.addRow([text]);
        ws.mergeCells(row.number, 1, row.number, last);
        row.getCell(1).font = { bold, size, color: { argb: MAROON } };
        row.getCell(1).alignment = { horizontal: "center" };
        return row;
      }
      titleRow("Srimath Anantheshwar Temple, Manjeshwar (Kerala)", 14, true);
      titleRow("Student Scholarship Report (Approved Applications)", 11, true);
      titleRow(headerLine.replace(/₹/g, "Rs. "), 10, false);
      ws.addRow([]);

      function headerRow() {
        const row = ws.addRow(EXPORT_COLUMNS);
        row.eachCell((cell) => {
          cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: MAROON } };
          cell.alignment = { vertical: "middle", wrapText: true };
        });
        return row;
      }

      function dataRow(r: Row) {
        const row = ws.addRow(exportCells(r));
        // Written as text with an explicit text format, so a leading zero
        // survives and a long number is never rounded.
        const account = row.getCell(ACCOUNT_COL + 1);
        account.value = r.bank_account;
        account.numFmt = "@";
        account.alignment = { horizontal: "left" };
        const amount = row.getCell(last);
        amount.numFmt = "#,##0";
        return row;
      }

      function subtotalRow(label: string, amount: number) {
        const row = ws.addRow([label]);
        ws.mergeCells(row.number, 1, row.number, last - 1);
        row.getCell(1).font = { bold: true };
        row.getCell(1).alignment = { horizontal: "right" };
        const cell = row.getCell(last);
        cell.value = amount;
        cell.numFmt = "#,##0";
        cell.font = { bold: true };
        return row;
      }

      if (mode === "summary") {
        const { header, body, total } = summaryTable();
        const head = ws.addRow(header);
        head.eachCell((cell) => {
          cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: MAROON } };
        });
        body.forEach((r) => ws.addRow(r));
        const totalRow = ws.addRow(total);
        totalRow.eachCell((cell) => {
          cell.font = { bold: true, color: { argb: MAROON } };
        });
        [22, ...header.slice(1).map(() => 16)].forEach((w, i) => {
          ws.getColumn(i + 1).width = w;
        });
        const buf = await wb.xlsx.writeBuffer();
        downloadBlob(
          new Blob([buf], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }),
          `${fileSuffix()}.xlsx`
        );
        return;
      }

      if (mode === "flat") {
        headerRow();
        rows.forEach(dataRow);
      } else {
        for (const g of groups) {
          const band = ws.addRow([g.label]);
          ws.mergeCells(band.number, 1, band.number, last);
          band.getCell(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
          band.getCell(1).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: NAVY },
          };
          headerRow();
          g.list.forEach(dataRow);
          subtotalRow(`Subtotal — ${g.count} student${g.count !== 1 ? "s" : ""}`, g.amount);
          ws.addRow([]);
        }
      }

      const grand = subtotalRow(`TOTAL — ${totals.count} students`, totals.amount);
      grand.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: MAROON }, size: 12 };
      });

      // getColumn rather than ws.columns — exceljs only populates that lazily.
      [14, 26, 14, 14, 30, 24, 18, 22, 14, 14].forEach((w, i) => {
        ws.getColumn(i + 1).width = w;
      });

      const buffer = await wb.xlsx.writeBuffer();
      downloadBlob(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        `${fileSuffix()}.xlsx`
      );
    } finally {
      setXlsxBusy(false);
    }
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

      const head = [EXPORT_COLUMNS];
      const rowToArr = (r: Row) =>
        exportCells(r).map((v, i) =>
          i === AMOUNT_COL ? Number(v).toLocaleString("en-IN") : String(v)
        );
      const amountCol = AMOUNT_COL;
      const commonStyles = {
        styles: { fontSize: 8, cellPadding: 1.8 },
        columnStyles: { [amountCol]: { halign: "right" as const } },
      };

      let y = 35;
      if (mode === "summary") {
        const { header, body, total } = summaryTable();
        autoTable(doc, {
          startY: y,
          head: [header],
          body: [...body.map((r) => r.map(String)), total.map(String)],
          headStyles: { fillColor: maroon, fontSize: 9 },
          styles: { fontSize: 9, cellPadding: 2.4 },
          columnStyles: Object.fromEntries(
            header.map((_, i) => [i, { halign: i === 0 ? ("left" as const) : ("right" as const) }])
          ),
          didParseCell: (data) => {
            if (data.section === "body" && data.row.index === body.length) {
              data.cell.styles.fontStyle = "bold";
            }
          },
        });
        doc.save(`scholarship-report-${fileSuffix()}.pdf`);
        return;
      }
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

  // A pinned pete is already named in the header line; a consolidated report
  // needs the column, or bank branches like KUMBALA read as pete names.
  const showPeteColumn = !isSpecificPete;

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
        {showPeteColumn && <td>{r.pete_name}</td>}
        <td className="text-sm">{[r.current_class, r.course_name].filter(Boolean).join(" — ")}</td>
        <td>{r.bank_name}</td>
        <td>{r.bank_branch}</td>
        <td className="font-mono text-xs">{r.bank_account}</td>
        <td className="font-mono text-xs">{r.ifsc}</td>
        <td className="text-right font-semibold text-navy-800">{inr(r.scholarship_amount)}</td>
      </>
    );
  }

  const colCount = showPeteColumn ? 9 : 8;

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
          <button onClick={exportExcel} disabled={xlsxBusy || !rows} className="btn-secondary">
            {xlsxBusy ? "Preparing…" : "📗 Excel"}
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
      ) : mode === "summary" && summary ? (
        <>
          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>Pete</th>
                  {summary.categories.map((c) => (
                    <th key={c} className="text-right!">
                      {c}
                    </th>
                  ))}
                  <th className="text-right!">Total</th>
                </tr>
              </thead>
              <tbody>
                {summary.peteRows.map((r) => (
                  <tr key={r.pete}>
                    <td className="font-medium">{r.pete}</td>
                    {r.counts.map((n, i) => (
                      <td key={summary.categories[i]} className="text-right">
                        {n === 0 ? <span className="text-stone-300">—</span> : n}
                      </td>
                    ))}
                    <td className="text-right font-semibold text-navy-800">{r.total}</td>
                  </tr>
                ))}
                <tr>
                  <td className="font-display text-maroon-900">TOTAL</td>
                  {summary.columnTotals.map((n, i) => (
                    <td
                      key={summary.categories[i]}
                      className="text-right font-bold text-maroon-900"
                    >
                      {n}
                    </td>
                  ))}
                  <td className="text-right font-bold text-maroon-900">{summary.grandTotal}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-stone-400">
            Counts approved applications only, the same basis as every other report here.
          </p>
        </>
      ) : (
        <>
          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Name</th>
                  {showPeteColumn && <th>Pete</th>}
                  <th>Class / Course</th>
                  <th>Bank</th>
                  <th>Bank Branch</th>
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
                            {mode === "class" ? "🎓" : "🏦"} {g.label}
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
