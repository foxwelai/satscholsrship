"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import ApplicationForm, { ApplicationValues } from "@/components/ApplicationForm";
import { financialYearOptions } from "@/lib/constants";

type StudentSummary = {
  id: number;
  student_id: string;
  name: string;
  pete_name: string;
  applications: { financialYear: string; category: string; currentClass: string }[];
};

export default function NewApplicationYearPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [student, setStudent] = useState<StudentSummary | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch(`/api/students/${id}`)
      .then((r) => r.json())
      .then(setStudent);
  }, [id]);

  async function handleSave(values: ApplicationValues, action: "save" | "approve_close") {
    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id: Number(id), ...values, action }),
    });
    const data = await res.json();
    if (!res.ok) return data.error ?? "Failed to save application";
    setDone(true);
    return null;
  }

  if (!student) return <p className="text-gray-500">Loading…</p>;

  if (done) {
    return (
      <div className="card mx-auto max-w-lg overflow-hidden text-center">
        <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-gold-400 to-emerald-500" />
        <div className="p-10">
          <p className="text-6xl">✅</p>
          <h1 className="mt-4 font-display text-2xl tracking-wide text-emerald-800">
            Application Saved
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            for <span className="font-semibold text-stone-700">{student.name}</span> ({student.student_id})
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href={`/students/${id}`} className="btn-primary">
              Back to Student
            </Link>
            <button onClick={() => router.push(`/students`)} className="btn-secondary">
              Search Students
            </button>
          </div>
        </div>
      </div>
    );
  }

  const latest = [...student.applications].sort((a, b) => (a.financialYear < b.financialYear ? 1 : -1))[0];
  const suggestedYear =
    financialYearOptions().find((fy) => !student.applications.some((a) => a.financialYear === fy)) ??
    financialYearOptions()[3];

  return (
    <div>
      <h1 className="page-title">Renew — {student.name}</h1>
      <p className="page-subtitle mb-6">
        <span className="font-mono font-semibold text-maroon-800">{student.student_id}</span> ·{" "}
        {student.pete_name} Pete. Add this year&apos;s class and details, then either save as a
        normal application or fast-track with{" "}
        <span className="font-semibold text-emerald-700">Approve &amp; Close</span> for a returning,
        already-vetted student.
      </p>
      <ApplicationForm
        mode="create"
        initial={{
          financial_year: suggestedYear,
          category: latest?.category ?? "",
          current_class: latest?.currentClass ?? "",
        }}
        onSave={handleSave}
      />
    </div>
  );
}
