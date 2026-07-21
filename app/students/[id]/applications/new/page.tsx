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
      <div className="mx-auto max-w-lg rounded-lg border-2 border-green-600 bg-white p-8 text-center shadow">
        <p className="text-5xl">✅</p>
        <h1 className="mt-3 text-xl font-bold text-green-800">Application Saved</h1>
        <p className="mt-2 text-gray-700">
          for {student.name} ({student.student_id})
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href={`/students/${id}`} className="rounded bg-red-800 px-5 py-2 font-semibold text-white hover:bg-red-700">
            Back to Student
          </Link>
          <button
            onClick={() => router.push(`/students`)}
            className="rounded border-2 border-red-800 px-5 py-2 font-semibold text-red-800 hover:bg-red-50"
          >
            Search Students
          </button>
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
      <h1 className="mb-1 text-xl font-bold text-red-900">Renew — {student.name}</h1>
      <p className="mb-4 text-sm text-gray-600">
        {student.student_id} · {student.pete_name} Pete. Add this year&apos;s class and details, then
        either save as a normal application or fast-track with{" "}
        <span className="font-semibold">Approve &amp; Close</span> for a returning, already-vetted
        student.
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
