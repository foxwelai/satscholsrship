"use client";

import { useCallback, useEffect, useState } from "react";
import { CATEGORIES, financialYearOptions } from "@/lib/constants";

type Rate = { financialYear: string; category: string; amount: number };

export default function ScholarshipRatesPage() {
  const [rates, setRates] = useState<Rate[]>([]);
  const [grid, setGrid] = useState<Record<string, Record<string, string>>>({});
  const [savingYear, setSavingYear] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    fetch("/api/admin/rates")
      .then((r) => r.json())
      .then((data: Rate[]) => {
        setRates(data);
        const next: Record<string, Record<string, string>> = {};
        for (const r of data) {
          next[r.financialYear] = next[r.financialYear] ?? {};
          next[r.financialYear][r.category] = String(r.amount);
        }
        setGrid(next);
      });
  }, []);
  useEffect(load, [load]);

  const years = Array.from(
    new Set([...financialYearOptions(), ...rates.map((r) => r.financialYear)])
  ).sort((a, b) => (a < b ? 1 : -1));

  function setCell(year: string, category: string, value: string) {
    setGrid((prev) => ({
      ...prev,
      [year]: { ...prev[year], [category]: value },
    }));
  }

  async function saveYear(year: string) {
    setSavingYear(year);
    setError("");
    setNotice("");
    try {
      for (const category of CATEGORIES) {
        const amount = Number(grid[year]?.[category] ?? 0);
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
      setNotice(`Saved scholarship amounts for ${year}`);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save rates");
    } finally {
      setSavingYear(null);
    }
  }

  return (
    <div>
      <h1 className="page-title">Scholarship Rates</h1>
      <p className="page-subtitle mb-6">
        The scholarship amount per category, editable every financial year. New applications suggest
        this amount automatically — staff can still override it per student.
      </p>

      {notice && <div className="alert-success mb-4">{notice}</div>}
      {error && <div className="alert-error mb-4">{error}</div>}

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Financial Year</th>
              {CATEGORIES.map((c) => (
                <th key={c}>{c}</th>
              ))}
              <th></th>
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
                  <button
                    onClick={() => saveYear(year)}
                    disabled={savingYear !== null}
                    className="btn-primary px-4 py-1.5 text-xs"
                  >
                    {savingYear === year ? "Saving…" : "Save"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
