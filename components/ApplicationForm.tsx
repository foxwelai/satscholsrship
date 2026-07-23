"use client";

import { useEffect, useState } from "react";
import { CATEGORIES, CLASSES, APPLICATION_STATUSES, financialYearOptions } from "@/lib/constants";

export type ApplicationValues = {
  financial_year: string;
  category: string;
  current_class: string;
  prev_year_marks: string;
  annual_fee: string;
  status?: string;
};

export default function ApplicationForm({
  initial,
  mode,
  lockFinancialYear = false,
  onSave,
}: {
  initial?: Partial<ApplicationValues>;
  mode: "create" | "edit";
  lockFinancialYear?: boolean;
  onSave: (values: ApplicationValues, action: "save" | "approve_close") => Promise<string | null>;
}) {
  const [values, setValues] = useState<ApplicationValues>({
    financial_year: initial?.financial_year ?? financialYearOptions()[2],
    category: initial?.category ?? "",
    current_class: initial?.current_class ?? "",
    prev_year_marks: initial?.prev_year_marks ?? "",
    annual_fee: initial?.annual_fee ?? "",
    status: initial?.status ?? "Applied",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<"save" | "approve_close" | null>(null);
  const [yearOptions, setYearOptions] = useState<string[]>(financialYearOptions());

  // Merge financial years configured by the super admin (in Scholarship
  // Rates) into the default window so renewals can target them.
  useEffect(() => {
    fetch("/api/rates")
      .then((r) => r.json())
      .then((data: { years?: string[] }) => {
        setYearOptions((prev) =>
          Array.from(new Set([...prev, ...(data.years ?? [])])).sort((a, b) => (a < b ? 1 : -1))
        );
      })
      .catch(() => {});
  }, []);

  const set = (field: keyof ApplicationValues) => (v: string) =>
    setValues((prev) => ({ ...prev, [field]: v }));

  async function submit(action: "save" | "approve_close") {
    setError("");
    setSaving(action);
    const err = await onSave(values, action);
    setSaving(null);
    if (err) setError(err);
  }

  const classOptions = values.category ? CLASSES[values.category] ?? [] : [];
  const allYearOptions = Array.from(new Set([values.financial_year, ...yearOptions])).sort(
    (a, b) => (a < b ? 1 : -1)
  );

  return (
    <div className="card overflow-hidden">
      <div className="card-header">
        <span className="accent-bar" />
        <h2 className="card-title">Scholarship Application Details</h2>
      </div>
      <div className="space-y-4 p-5">
      {error && <div className="alert-error">{error}</div>}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="label">
            Financial Year <span className="text-maroon-700">*</span>
          </span>
          <select
            required
            disabled={lockFinancialYear}
            value={values.financial_year}
            onChange={(e) => set("financial_year")(e.target.value)}
            className="input"
          >
            {allYearOptions.map((fy) => (
              <option key={fy}>{fy}</option>
            ))}
          </select>
        </label>

        {mode === "edit" && (
          <label className="block">
            <span className="label">Status</span>
            <select
              value={values.status}
              onChange={(e) => set("status")(e.target.value)}
              className="input"
            >
              {APPLICATION_STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        )}

        <label className="block">
          <span className="label">
            Category <span className="text-maroon-700">*</span>
          </span>
          <select
            required
            value={values.category}
            onChange={(e) => setValues((prev) => ({ ...prev, category: e.target.value, current_class: "" }))}
            className="input"
          >
            <option value="">— Select Category —</option>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="label">
            Class / Course (this financial year) <span className="text-maroon-700">*</span>
          </span>
          <select
            required
            value={values.current_class}
            onChange={(e) => set("current_class")(e.target.value)}
            className="input"
          >
            <option value="">— Select Class —</option>
            {classOptions.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="label">Marks / Percentage (previous year)</span>
          <input
            value={values.prev_year_marks}
            onChange={(e) => set("prev_year_marks")(e.target.value)}
            placeholder="e.g. 87% — Distinction"
            className="input"
          />
        </label>

        <label className="block">
          <span className="label">Annual School / College Fee (₹)</span>
          <input
            value={values.annual_fee}
            onChange={(e) => set("annual_fee")(e.target.value)}
            className="input"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-3 pt-1">
        <button
          type="button"
          disabled={saving !== null}
          onClick={() => submit("save")}
          className="btn-primary px-7"
        >
          {saving === "save" ? "Saving…" : mode === "create" ? "Save Application" : "Save Changes"}
        </button>
        <button
          type="button"
          disabled={saving !== null}
          onClick={() => submit("approve_close")}
          className="btn-success px-7"
          title="Fast-track: mark this year's scholarship Approved and Closed in one step"
        >
          {saving === "approve_close" ? "Processing…" : "✓ Approve & Close"}
        </button>
      </div>
      </div>
    </div>
  );
}
