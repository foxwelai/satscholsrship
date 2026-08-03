"use client";

import { useEffect, useState } from "react";
import {
  CATEGORIES,
  CLASSES,
  COURSE_OPTIONS_BY_CATEGORY,
  APPLICATION_STATUSES,
} from "@/lib/constants";
import { useSession } from "@/lib/useSession";

export type ApplicationValues = {
  financial_year: string;
  category: string;
  current_class: string;
  course_name: string;
  pincode: string;
  location: string;
  prev_year_marks: string;
  annual_fee: string;
  status?: string;
  rejection_reason?: string;
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
  const session = useSession();
  const [values, setValues] = useState<ApplicationValues>({
    financial_year: initial?.financial_year ?? "",
    category: initial?.category ?? "",
    current_class: initial?.current_class ?? "",
    course_name: initial?.course_name ?? "",
    pincode: initial?.pincode ?? "",
    location: initial?.location ?? "",
    prev_year_marks: initial?.prev_year_marks ?? "",
    annual_fee: initial?.annual_fee ?? "",
    status: initial?.status ?? "Pending Approval",
    rejection_reason: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<"save" | "approve_close" | null>(null);
  const [yearOptions, setYearOptions] = useState<string[]>([]);

  // The only selectable years are the configured current academic year and,
  // when the super admin has opened it, the renewal year. Old years never
  // appear.
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data: { current_academic_year?: string; renewal_year?: string }) => {
        const opts = [data.current_academic_year, data.renewal_year].filter(Boolean) as string[];
        setYearOptions(opts);
        setValues((prev) =>
          prev.financial_year ? prev : { ...prev, financial_year: opts[0] ?? "" }
        );
      })
      .catch(() => {});
  }, []);

  const set = (field: keyof ApplicationValues) => (v: string) =>
    setValues((prev) => ({ ...prev, [field]: v }));

  async function fetchLocation(pin: string) {
    try {
      const res = await fetch(`/api/pincode?pin=${pin}`);
      const data = await res.json();
      if (data.location) setValues((prev) => ({ ...prev, location: data.location }));
    } catch {
      // lookup is a convenience only — the form still submits without it
    }
  }

  async function submit(action: "save" | "approve_close") {
    setError("");
    if (needsCourse && !values.course_name.trim()) {
      setError("Please select the course name.");
      return;
    }
    if (values.status === "Rejected" && !values.rejection_reason?.trim() && mode === "edit") {
      setError("A rejection reason is required when rejecting.");
      return;
    }
    setSaving(action);
    const err = await onSave(values, action);
    setSaving(null);
    if (err) setError(err);
  }

  const isSuperAdmin = session?.role === "super_admin";
  const classOptions = values.category ? CLASSES[values.category] ?? [] : [];
  const courseOptions = values.category ? COURSE_OPTIONS_BY_CATEGORY[values.category] ?? [] : [];
  const needsCourse = courseOptions.length > 0;
  const allYearOptions = Array.from(new Set([values.financial_year, ...yearOptions].filter(Boolean))).sort(
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

          {mode === "edit" && isSuperAdmin && (
            <label className="block">
              <span className="label">Status (super admin)</span>
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

          {mode === "edit" && isSuperAdmin && values.status === "Rejected" && (
            <label className="block md:col-span-2">
              <span className="label">
                Rejection Reason <span className="text-maroon-700">*</span>
              </span>
              <textarea
                value={values.rejection_reason}
                onChange={(e) => set("rejection_reason")(e.target.value)}
                placeholder="e.g. Income certificate missing, marks card not attached…"
                className="input min-h-20"
              />
            </label>
          )}

          <label className="block">
            <span className="label">
              Category <span className="text-maroon-700">*</span>
            </span>
            <select
              required
              value={values.category}
              onChange={(e) =>
                setValues((prev) => ({
                  ...prev,
                  category: e.target.value,
                  current_class: "",
                  course_name: "",
                }))
              }
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

          {needsCourse && (
            <label className="block">
              <span className="label">
                Course Name <span className="text-maroon-700">*</span>
              </span>
              <select
                required
                value={values.course_name}
                onChange={(e) => set("course_name")(e.target.value)}
                className="input"
              >
                <option value="">— Select Course —</option>
                {courseOptions.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          )}

          <label className="block">
            <span className="label">Postal Code (Pincode)</span>
            <input
              value={values.pincode}
              onChange={(e) => {
                const pin = e.target.value.replace(/\D/g, "").slice(0, 6);
                set("pincode")(pin);
                if (pin.length === 6) fetchLocation(pin);
              }}
              placeholder="e.g. 671310 — auto-fetches the place"
              maxLength={6}
              className="input"
            />
            {values.location && (
              <p className="mt-1.5 text-xs font-semibold text-emerald-700">✓ {values.location}</p>
            )}
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
            {saving === "save"
              ? "Saving…"
              : mode === "create"
                ? "Submit for Approval"
                : "Save Changes"}
          </button>
          {isSuperAdmin && (
            <button
              type="button"
              disabled={saving !== null}
              onClick={() => submit("approve_close")}
              className="btn-success px-7"
              title="Fast-track: mark this year's scholarship Approved and Closed in one step"
            >
              {saving === "approve_close" ? "Processing…" : "✓ Approve & Close"}
            </button>
          )}
        </div>
        {mode === "create" && !isSuperAdmin && (
          <p className="text-xs text-stone-400">
            The application will be sent to the super admin for approval.
          </p>
        )}
      </div>
    </div>
  );
}
