"use client";

import { useEffect, useRef, useState } from "react";
import { CATEGORIES, CLASSES, COURSE_OPTIONS_BY_CATEGORY } from "@/lib/constants";
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
};

export const EMPTY_APPLICATION: ApplicationValues = {
  financial_year: "",
  category: "",
  current_class: "",
  course_name: "",
  pincode: "",
  location: "",
  prev_year_marks: "",
  annual_fee: "",
};

export function applicationValues(initial?: Partial<ApplicationValues>): ApplicationValues {
  return { ...EMPTY_APPLICATION, ...initial };
}

// The first problem with the values, or null when they are good to save.
export function validateApplication(values: ApplicationValues): string | null {
  const courseOptions = COURSE_OPTIONS_BY_CATEGORY[values.category] ?? [];
  if (courseOptions.length > 0 && !values.course_name.trim()) {
    return "Please select the course name.";
  }
  return null;
}

// The year-specific half of an application, as a controlled card. Kept
// separate from the form below so the edit page can save it in the same
// submit as the student's own details.
export function ApplicationFields({
  values,
  onChange,
  lockFinancialYear = false,
  title = "Scholarship Application Details",
}: {
  values: ApplicationValues;
  onChange: (patch: Partial<ApplicationValues>) => void;
  lockFinancialYear?: boolean;
  title?: string;
}) {
  const [yearOptions, setYearOptions] = useState<string[]>([]);
  // Async replies are checked against the values as they are when the reply
  // lands, not as they were when the request went out.
  const latest = useRef(values);
  useEffect(() => {
    latest.current = values;
  });

  // The only selectable years are the configured current academic year and,
  // when the super admin has opened it, the renewal year. Old years never
  // appear.
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data: { current_academic_year?: string; renewal_year?: string }) => {
        const opts = [data.current_academic_year, data.renewal_year].filter(Boolean) as string[];
        setYearOptions(opts);
        if (!latest.current.financial_year && opts[0]) onChange({ financial_year: opts[0] });
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchLocation(pin: string) {
    try {
      const res = await fetch(`/api/pincode?pin=${pin}`);
      const data = await res.json();
      // Ignore a slow reply for a pincode the user has already typed past.
      if (data.location && latest.current.pincode === pin) onChange({ location: data.location });
    } catch {
      // lookup is a convenience only — the form still submits without it
    }
  }

  const classOptions = values.category ? CLASSES[values.category] ?? [] : [];
  const courseOptions = values.category ? COURSE_OPTIONS_BY_CATEGORY[values.category] ?? [] : [];
  const needsCourse = courseOptions.length > 0;
  const allYearOptions = Array.from(
    new Set([values.financial_year, ...yearOptions].filter(Boolean))
  ).sort((a, b) => (a < b ? 1 : -1));

  return (
    <section className="card overflow-hidden">
      <div className="card-header">
        <span className="accent-bar" />
        <h2 className="card-title">{title}</h2>
      </div>
      <div className="grid gap-4 p-5 md:grid-cols-2">
        <label className="block">
          <span className="label">
            Financial Year <span className="text-maroon-700">*</span>
          </span>
          <select
            required
            disabled={lockFinancialYear}
            value={values.financial_year}
            onChange={(e) => onChange({ financial_year: e.target.value })}
            className="input"
          >
            {allYearOptions.map((fy) => (
              <option key={fy}>{fy}</option>
            ))}
          </select>
          {lockFinancialYear && (
            <p className="mt-1.5 text-xs text-stone-400">
              The year of an existing application cannot be changed — renew the student for a new
              year instead.
            </p>
          )}
        </label>

        <label className="block">
          <span className="label">
            Category <span className="text-maroon-700">*</span>
          </span>
          <select
            required
            value={values.category}
            onChange={(e) =>
              onChange({ category: e.target.value, current_class: "", course_name: "" })
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
            onChange={(e) => onChange({ current_class: e.target.value })}
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
              onChange={(e) => onChange({ course_name: e.target.value })}
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
              // Drop the old place the moment the pincode changes, so a
              // failed lookup cannot leave the previous one attached to it.
              onChange({ pincode: pin, location: "" });
              if (pin.length === 6) fetchLocation(pin);
            }}
            placeholder="e.g. 671310 — auto-fills the place"
            maxLength={6}
            className="input"
          />
        </label>

        <label className="block">
          <span className="label">Place / Location</span>
          <input
            value={values.location}
            onChange={(e) => onChange({ location: e.target.value })}
            placeholder="Auto-filled from the pincode — edit if it is wrong"
            className="input"
          />
        </label>

        <label className="block">
          <span className="label">Marks / Percentage (previous year)</span>
          <input
            value={values.prev_year_marks}
            onChange={(e) => onChange({ prev_year_marks: e.target.value })}
            placeholder="e.g. 87% — Distinction"
            className="input"
          />
        </label>

        <label className="block">
          <span className="label">Annual School / College Fee (₹)</span>
          <input
            value={values.annual_fee}
            onChange={(e) => onChange({ annual_fee: e.target.value })}
            className="input"
          />
        </label>
      </div>
    </section>
  );
}

// Standalone application form — the fields above plus their own save buttons.
// Used where an application is created on its own; the edit page composes
// ApplicationFields with the student's details under a single save instead.
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
  const [values, setValues] = useState<ApplicationValues>(() => applicationValues(initial));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<"save" | "approve_close" | null>(null);

  async function submit(action: "save" | "approve_close") {
    setError("");
    const problem = validateApplication(values);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(action);
    const err = await onSave(values, action);
    setSaving(null);
    if (err) setError(err);
  }

  const isSuperAdmin = session?.role === "super_admin";

  return (
    <div className="space-y-4">
      {error && <div className="alert-error">{error}</div>}

      <ApplicationFields
        values={values}
        onChange={(patch) => setValues((prev) => ({ ...prev, ...patch }))}
        lockFinancialYear={lockFinancialYear}
      />

      <div className="flex flex-wrap gap-3">
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
  );
}
