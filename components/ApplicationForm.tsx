"use client";

import { useState } from "react";
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

  return (
    <div className="space-y-4 rounded-lg border-2 border-blue-200 bg-white p-4 shadow-sm">
      {error && (
        <div className="rounded border-2 border-red-500 bg-red-50 px-4 py-2 font-semibold text-red-800">
          {error}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-gray-700">
            Financial Year <span className="text-red-600">*</span>
          </span>
          <select
            required
            disabled={lockFinancialYear}
            value={values.financial_year}
            onChange={(e) => set("financial_year")(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 disabled:bg-gray-100 focus:border-red-700 focus:outline-none"
          >
            {financialYearOptions().map((fy) => (
              <option key={fy}>{fy}</option>
            ))}
          </select>
        </label>

        {mode === "edit" && (
          <label className="block text-sm">
            <span className="font-medium text-gray-700">Status</span>
            <select
              value={values.status}
              onChange={(e) => set("status")(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 focus:border-red-700 focus:outline-none"
            >
              {APPLICATION_STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        )}

        <label className="block text-sm">
          <span className="font-medium text-gray-700">
            Category <span className="text-red-600">*</span>
          </span>
          <select
            required
            value={values.category}
            onChange={(e) => setValues((prev) => ({ ...prev, category: e.target.value, current_class: "" }))}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 focus:border-red-700 focus:outline-none"
          >
            <option value="">— Select Category —</option>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="font-medium text-gray-700">
            Class / Course (this financial year) <span className="text-red-600">*</span>
          </span>
          <select
            required
            value={values.current_class}
            onChange={(e) => set("current_class")(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 focus:border-red-700 focus:outline-none"
          >
            <option value="">— Select Class —</option>
            {classOptions.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="font-medium text-gray-700">Marks / Percentage (previous year)</span>
          <input
            value={values.prev_year_marks}
            onChange={(e) => set("prev_year_marks")(e.target.value)}
            placeholder="e.g. 87% — Distinction"
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 focus:border-red-700 focus:outline-none"
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium text-gray-700">Annual School / College Fee (₹)</span>
          <input
            value={values.annual_fee}
            onChange={(e) => set("annual_fee")(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 focus:border-red-700 focus:outline-none"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-3 pt-1">
        <button
          type="button"
          disabled={saving !== null}
          onClick={() => submit("save")}
          className="rounded-lg bg-red-800 px-6 py-2.5 font-bold text-white shadow hover:bg-red-700 disabled:opacity-50"
        >
          {saving === "save" ? "Saving…" : mode === "create" ? "Save Application" : "Save Changes"}
        </button>
        <button
          type="button"
          disabled={saving !== null}
          onClick={() => submit("approve_close")}
          className="rounded-lg bg-green-700 px-6 py-2.5 font-bold text-white shadow hover:bg-green-600 disabled:opacity-50"
          title="Fast-track: mark this year's scholarship Approved and Closed in one step"
        >
          {saving === "approve_close" ? "Processing…" : "✓ Approve & Close"}
        </button>
      </div>
    </div>
  );
}
