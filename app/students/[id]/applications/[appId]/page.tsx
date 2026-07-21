"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ApplicationForm, { ApplicationValues } from "@/components/ApplicationForm";

type StudentDetail = {
  id: number;
  student_id: string;
  name: string;
  pete_name: string;
  applications: {
    id: number;
    financialYear: string;
    category: string;
    currentClass: string;
    prevYearMarks: string;
    annualFee: string;
    status: string;
    closed: boolean;
  }[];
};

export default function EditApplicationPage() {
  const { id, appId } = useParams<{ id: string; appId: string }>();
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/students/${id}`)
      .then((r) => r.json())
      .then(setStudent);
  }, [id]);

  async function handleSave(values: ApplicationValues, action: "save" | "approve_close") {
    const res = await fetch(`/api/applications/${appId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, action: action === "approve_close" ? "approve_close" : undefined }),
    });
    const data = await res.json();
    if (!res.ok) return data.error ?? "Failed to save application";
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    const fresh = await fetch(`/api/students/${id}`).then((r) => r.json());
    setStudent(fresh);
    return null;
  }

  async function handleReopen() {
    if (!confirm("Reopen this application for further changes?")) return;
    await fetch(`/api/applications/${appId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reopen" }),
    });
    const fresh = await fetch(`/api/students/${id}`).then((r) => r.json());
    setStudent(fresh);
  }

  if (!student) return <p className="text-gray-500">Loading…</p>;
  const app = student.applications.find((a) => a.id === Number(appId));
  if (!app) return <p className="text-red-700">Application not found.</p>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-red-900">
            {student.name} — {app.financialYear}
          </h1>
          <p className="text-sm text-gray-600">
            {student.student_id} · {student.pete_name} Pete
          </p>
        </div>
        <Link href={`/students/${id}`} className="text-sm font-semibold text-red-800 hover:underline">
          ← Back to Student
        </Link>
      </div>

      {saved && (
        <div className="mb-4 rounded border-2 border-green-500 bg-green-50 px-4 py-2 font-semibold text-green-800">
          ✓ Application updated
        </div>
      )}

      {app.closed && (
        <div className="mb-4 flex items-center justify-between rounded border-2 border-gray-300 bg-gray-50 px-4 py-2">
          <p className="font-semibold text-gray-700">
            This year&apos;s scholarship is closed ({app.status}).
          </p>
          <button onClick={handleReopen} className="text-sm font-semibold text-blue-800 hover:underline">
            Reopen
          </button>
        </div>
      )}

      <ApplicationForm
        mode="edit"
        lockFinancialYear
        initial={{
          financial_year: app.financialYear,
          category: app.category,
          current_class: app.currentClass,
          prev_year_marks: app.prevYearMarks,
          annual_fee: app.annualFee,
          status: app.status,
        }}
        onSave={handleSave}
      />
    </div>
  );
}
