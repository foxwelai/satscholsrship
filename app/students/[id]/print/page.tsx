"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ScholarshipForm, { StudentData } from "@/components/ScholarshipForm";

type Application = {
  id: number;
  financialYear: string;
  category: string;
  currentClass: string;
  prevYearMarks: string;
  annualFee: string;
};

type StudentFull = StudentData & { id: number; applications: Application[] };

export default function PrintStudentPage() {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<StudentFull | null>(null);
  const [financialYear, setFinancialYear] = useState("");

  useEffect(() => {
    fetch(`/api/students/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setStudent(data);
        const sorted = [...(data.applications ?? [])].sort((a, b) =>
          a.financialYear < b.financialYear ? 1 : -1
        );
        if (sorted[0]) setFinancialYear(sorted[0].financialYear);
      });
  }, [id]);

  const merged: StudentData | null = useMemo(() => {
    if (!student) return null;
    const app = student.applications.find((a) => a.financialYear === financialYear);
    return {
      ...student,
      category: app?.category ?? "",
      current_class: app?.currentClass ?? "",
      prev_year_marks: app?.prevYearMarks ?? "",
      annual_fee: app?.annualFee ?? "",
      financial_year: app?.financialYear ?? "",
    };
  }, [student, financialYear]);

  if (!student || !merged) return <p className="text-gray-500">Loading…</p>;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-red-900">
            Application — {student.name} ({student.student_id})
          </h1>
          <p className="text-sm text-gray-600">Official form format, filled with the student's details.</p>
        </div>
        <div className="flex items-center gap-2">
          {student.applications.length > 0 && (
            <select
              value={financialYear}
              onChange={(e) => setFinancialYear(e.target.value)}
              className="rounded border-2 border-red-300 px-3 py-2 text-sm focus:border-red-700 focus:outline-none"
            >
              {student.applications.map((a) => (
                <option key={a.id} value={a.financialYear}>
                  {a.financialYear}
                </option>
              ))}
            </select>
          )}
          <Link
            href={`/students/${id}`}
            className="rounded border-2 border-red-800 px-4 py-2 font-semibold text-red-800 hover:bg-red-50"
          >
            ← Back
          </Link>
          <button
            onClick={() => window.print()}
            className="rounded bg-red-800 px-5 py-2 font-semibold text-white shadow hover:bg-red-700"
          >
            🖨️ Print
          </button>
        </div>
      </div>
      <ScholarshipForm student={merged} />
    </div>
  );
}
