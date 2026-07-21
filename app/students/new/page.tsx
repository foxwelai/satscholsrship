"use client";

import { useState } from "react";
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
  });

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
      <div className="mx-auto max-w-xl rounded-lg border-2 border-green-600 bg-white p-8 text-center shadow">
        <p className="text-5xl">✅</p>
        <h1 className="mt-3 text-2xl font-bold text-green-800">Application Registered</h1>
        <p className="mt-4 text-gray-700">Student ID generated:</p>
        <p className="mt-1 text-3xl font-bold tracking-wide text-red-800">{created.student_id}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href={`/students/${created.id}`}
            className="rounded bg-red-800 px-5 py-2 font-semibold text-white hover:bg-red-700"
          >
            View Student
          </Link>
          <Link
            href={`/students/${created.id}/print`}
            className="rounded bg-blue-800 px-5 py-2 font-semibold text-white hover:bg-blue-700"
          >
            🖨️ Print Filled Form
          </Link>
          <button
            onClick={() => setCreated(null)}
            className="rounded border-2 border-red-800 px-5 py-2 font-semibold text-red-800 hover:bg-red-50"
          >
            + New Application
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-red-900">New Scholarship Application</h1>
      <p className="mb-4 text-sm text-gray-600">
        Student ID will be generated automatically from the selected Pete, e.g.{" "}
        <span className="font-mono font-semibold">MJS/26/0001</span>. Aadhar number is required and
        is used to find this student in future years.
      </p>
      <StudentForm submitLabel="Register Student" onSubmit={handleSubmit} session={session}>
        <fieldset className="rounded-lg border-2 border-red-200 bg-white p-4 shadow-sm">
          <legend className="px-2 text-base font-bold text-red-900">
            This Year&apos;s Application
          </legend>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium text-gray-700">
                Financial Year <span className="text-red-600">*</span>
              </span>
              <select
                required
                value={appFields.financial_year}
                onChange={(e) => setAppFields({ ...appFields, financial_year: e.target.value })}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 focus:border-red-700 focus:outline-none"
              >
                {financialYearOptions().map((fy) => (
                  <option key={fy}>{fy}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="font-medium text-gray-700">
                Category <span className="text-red-600">*</span>
              </span>
              <select
                required
                value={appFields.category}
                onChange={(e) => setAppFields({ ...appFields, category: e.target.value, current_class: "" })}
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
                Class / Course (current year) <span className="text-red-600">*</span>
              </span>
              <select
                required
                value={appFields.current_class}
                onChange={(e) => setAppFields({ ...appFields, current_class: e.target.value })}
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
                value={appFields.prev_year_marks}
                onChange={(e) => setAppFields({ ...appFields, prev_year_marks: e.target.value })}
                placeholder="e.g. 87% — Distinction"
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 focus:border-red-700 focus:outline-none"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-gray-700">Annual School / College Fee (₹)</span>
              <input
                value={appFields.annual_fee}
                onChange={(e) => setAppFields({ ...appFields, annual_fee: e.target.value })}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 focus:border-red-700 focus:outline-none"
              />
            </label>
          </div>
        </fieldset>
      </StudentForm>
    </div>
  );
}
