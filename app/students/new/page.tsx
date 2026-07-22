"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import StudentForm, { StudentFormValues } from "@/components/StudentForm";
import { useSession } from "@/lib/useSession";
import { CATEGORIES, CLASSES, currentFinancialYear, financialYearOptions } from "@/lib/constants";

type AppFields = {
  financial_year: string;
  category: string;
  current_class: string;
  prev_year_marks: string;
  annual_fee: string;
  scholarship_amount: string;
};

export default function NewStudentPage() {
  const session = useSession();
  const [created, setCreated] = useState<{ id: number; student_id: string } | null>(null);
  const [appFields, setAppFields] = useState<AppFields>({
    financial_year: currentFinancialYear(),
    category: "",
    current_class: "",
    prev_year_marks: "",
    annual_fee: "",
    scholarship_amount: "",
  });
  const [rateHint, setRateHint] = useState<number | null>(null);

  useEffect(() => {
    if (!appFields.category) {
      setRateHint(null);
      return;
    }
    fetch(`/api/rates?financial_year=${encodeURIComponent(appFields.financial_year)}`)
      .then((r) => r.json())
      .then((data: { rates: { category: string; amount: number }[] }) => {
        const rate = data.rates?.find((r) => r.category === appFields.category);
        setRateHint(rate ? rate.amount : null);
        if (rate) setAppFields((prev) => ({ ...prev, scholarship_amount: String(rate.amount) }));
      })
      .catch(() => setRateHint(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appFields.category, appFields.financial_year]);

  async function handleSubmit(values: StudentFormValues): Promise<string | null> {
    if (!appFields.category || !appFields.current_class) {
      return "Please select the student's category and current class for this financial year.";
    }
    const res = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, ...appFields }),
    });
    const data = await res.json();
    if (!res.ok) return data.error ?? "Failed to register student";
    setCreated(data);
    window.scrollTo({ top: 0 });
    return null;
  }

  const classOptions = appFields.category ? CLASSES[appFields.category] ?? [] : [];

  if (created) {
    return (
      <div className="card mx-auto max-w-xl overflow-hidden text-center">
        <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-gold-400 to-emerald-500" />
        <div className="p-10">
          <p className="text-6xl">✅</p>
          <h1 className="mt-4 font-display text-2xl tracking-wide text-emerald-800">
            Application Registered
          </h1>
          <p className="mt-5 text-sm text-stone-500">Student ID generated</p>
          <p className="mt-1 font-mono text-3xl font-bold tracking-wider text-maroon-800">
            {created.student_id}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href={`/students/${created.id}`} className="btn-primary">
              View Student
            </Link>
            <Link href={`/students/${created.id}/print`} className="btn-navy">
              🖨️ Print Filled Form
            </Link>
            <button onClick={() => setCreated(null)} className="btn-secondary">
              + New Application
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">New Scholarship Application</h1>
      <p className="page-subtitle mb-6">
        Student ID will be generated automatically from the selected Pete, e.g.{" "}
        <span className="font-mono font-semibold text-maroon-800">MJS/26/0001</span>. Aadhar number
        is required and is used to find this student in future years.
      </p>
      <StudentForm submitLabel="Register Student" onSubmit={handleSubmit} session={session}>
        <section className="card overflow-hidden">
          <div className="card-header">
            <span className="accent-bar" />
            <h2 className="card-title">This Year&apos;s Application</h2>
          </div>
          <div className="grid gap-4 p-5 md:grid-cols-2">
            <label className="block">
              <span className="label">
                Financial Year <span className="text-maroon-700">*</span>
              </span>
              <select
                required
                value={appFields.financial_year}
                onChange={(e) => setAppFields({ ...appFields, financial_year: e.target.value })}
                className="input"
              >
                {financialYearOptions().map((fy) => (
                  <option key={fy}>{fy}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label">
                Category <span className="text-maroon-700">*</span>
              </span>
              <select
                required
                value={appFields.category}
                onChange={(e) => setAppFields({ ...appFields, category: e.target.value, current_class: "" })}
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
                Class / Course (current year) <span className="text-maroon-700">*</span>
              </span>
              <select
                required
                value={appFields.current_class}
                onChange={(e) => setAppFields({ ...appFields, current_class: e.target.value })}
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
                value={appFields.prev_year_marks}
                onChange={(e) => setAppFields({ ...appFields, prev_year_marks: e.target.value })}
                placeholder="e.g. 87% — Distinction"
                className="input"
              />
            </label>
            <label className="block">
              <span className="label">Annual School / College Fee (₹)</span>
              <input
                value={appFields.annual_fee}
                onChange={(e) => setAppFields({ ...appFields, annual_fee: e.target.value })}
                className="input"
              />
            </label>
            <div>
              <label className="block">
                <span className="label">Scholarship Amount (₹)</span>
                <input
                  type="number"
                  min={0}
                  value={appFields.scholarship_amount}
                  onChange={(e) => setAppFields({ ...appFields, scholarship_amount: e.target.value })}
                  className="input"
                />
              </label>
              {rateHint !== null && (
                <p className="mt-1 text-xs text-gray-500">
                  Configured rate for {appFields.category} in {appFields.financial_year}: ₹{rateHint}
                </p>
              )}
            </div>
          </div>
        </section>
      </StudentForm>
    </div>
  );
}
