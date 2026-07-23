"use client";

import { useCallback, useEffect, useState } from "react";
import { CATEGORIES, currentFinancialYear, financialYearStart } from "@/lib/constants";

type Rate = { financialYear: string; category: string; amount: number };

function nextYearSuggestion(years: string[]): string {
  const latest = years[0] ?? currentFinancialYear();
  const start = financialYearStart(latest) + (years.length ? 1 : 0);
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

export default function ScholarshipRatesPage() {
  const [grid, setGrid] = useState<Record<string, Record<string, string>>>({});
  const [years, setYears] = useState<string[]>([]);
  const [newYear, setNewYear] = useState("");
  const [busy, setBusy] = useState<string | null>(null); // year being saved/deleted/added
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    fetch("/api/admin/rates")
      .then((r) => r.json())
      .then((data: Rate[]) => {
        const nextGrid: Record<string, Record<string, string>> = {};
        for (const r of data) {
          nextGrid[r.financialYear] = nextGrid[r.financialYear] ?? {};
          nextGrid[r.financialYear][r.category] = String(r.amount);
        }
        const sorted = Object.keys(nextGrid).sort((a, b) => (a < b ? 1 : -1));
        setGrid(nextGrid);
        setYears(sorted);
        setNewYear((cur) => cur || nextYearSuggestion(sorted));
      });
  }, []);
  useEffect(load, [load]);

  function setCell(year: string, category: string, value: string) {
    setGrid((prev) => ({ ...prev, [year]: { ...prev[year], [category]: value } }));
  }

  async function upsertYear(year: string, source: Record<string, string>) {
    for (const category of CATEGORIES) {
      const amount = Number(source[category] ?? 0) || 0;
      const res = await fetch("/api/admin/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ financial_year: year, category, amount }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? `Failed to save ${category}`);
      }
    }
  }

  async function addYear(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    const year = newYear.trim();
    if (!/^\d{4}-\d{2}$/.test(year)) {
      setError('Financial year must look like "2027-28"');
      return;
    }
    const start = financialYearStart(year);
    if (Number(year.slice(-2)) !== (start + 1) % 100) {
      setError(`End year doesn't follow the start year — did you mean ${start}-${String((start + 1) % 100).padStart(2, "0")}?`);
      return;
    }
    if (years.includes(year)) {
      setError(`${year} already exists — edit its amounts below.`);
      return;
    }
    setBusy("__add__");
    try {
      await upsertYear(year, {});
      setNotice(`Added financial year ${year} — set its amounts below and press Save.`);
      setNewYear("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add year");
    } finally {
      setBusy(null);
    }
  }

  async function saveYear(year: string) {
    setBusy(year);
    setError("");
    setNotice("");
    try {
      await upsertYear(year, grid[year] ?? {});
      setNotice(`Saved scholarship amounts for ${year}`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save rates");
    } finally {
      setBusy(null);
    }
  }

  async function deleteYear(year: string) {
    if (!confirm(`Delete all scholarship rates for ${year}? Reports for that year will show ₹0 until rates are added again.`)) return;
    setBusy(year);
    setError("");
    setNotice("");
    const res = await fetch(`/api/admin/rates?financial_year=${encodeURIComponent(year)}`, {
      method: "DELETE",
    });
    setBusy(null);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to delete year");
      return;
    }
    setNotice(`Deleted rates for ${year}`);
    load();
  }

  return (
    <div>
      <h1 className="page-title">Scholarship Rates</h1>
      <p className="page-subtitle mb-6">
        Set the scholarship amount per category for each financial year. Reports pick these amounts
        automatically based on each application&apos;s category and year — changing a rate updates
        the reports instantly.
      </p>

      {notice && <div className="alert-success mb-4">{notice}</div>}
      {error && <div className="alert-error mb-4">{error}</div>}

      <form onSubmit={addYear} className="card mb-6 overflow-hidden">
        <div className="card-header">
          <span className="accent-bar" />
          <h2 className="card-title">Add Financial Year</h2>
        </div>
        <div className="flex flex-wrap items-end gap-3 p-5">
          <label className="block">
            <span className="label">Financial Year (April–March)</span>
            <input
              value={newYear}
              onChange={(e) => setNewYear(e.target.value)}
              placeholder="e.g. 2027-28"
              className="input w-40 font-mono"
            />
          </label>
          <button disabled={busy !== null} className="btn-primary">
            {busy === "__add__" ? "Adding…" : "+ Add Year"}
          </button>
          <p className="text-xs text-stone-400">
            The year is created with ₹0 amounts — fill them in below and press Save.
          </p>
        </div>
      </form>

      {years.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-4xl">🪔</p>
          <p className="mt-3 text-sm text-stone-500">
            No financial years yet — add one above to begin.
          </p>
        </div>
      ) : (
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Financial Year</th>
                {CATEGORIES.map((c) => (
                  <th key={c}>{c}</th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {years.map((year) => (
                <tr key={year}>
                  <td className="font-display text-[15px] tracking-wide text-maroon-900">{year}</td>
                  {CATEGORIES.map((category) => (
                    <td key={category}>
                      <div className="relative w-28">
                        <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-xs text-stone-400">
                          ₹
                        </span>
                        <input
                          type="number"
                          min={0}
                          value={grid[year]?.[category] ?? "0"}
                          onChange={(e) => setCell(year, category, e.target.value)}
                          className="input py-1.5 pl-6 text-sm"
                        />
                      </div>
                    </td>
                  ))}
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => saveYear(year)}
                        disabled={busy !== null}
                        className="btn-primary px-4 py-1.5 text-xs"
                      >
                        {busy === year ? "…" : "Save"}
                      </button>
                      <button
                        onClick={() => deleteYear(year)}
                        disabled={busy !== null}
                        className="cursor-pointer text-xs font-bold text-red-700 hover:underline disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
