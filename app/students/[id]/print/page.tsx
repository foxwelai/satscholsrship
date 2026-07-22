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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="page-title">
            Application — {student.name}{" "}
            <span className="font-mono text-lg text-maroon-700">({student.student_id})</span>
          </h1>
          <p className="page-subtitle">Official form format, filled with the student's details.</p>
        </div>
        <div className="flex items-center gap-2">
          {student.applications.length > 0 && (
            <select
              value={financialYear}
              onChange={(e) => setFinancialYear(e.target.value)}
              className="input w-auto"
            >
              {student.applications.map((a) => (
                <option key={a.id} value={a.financialYear}>
                  {a.financialYear}
                </option>
              ))}
            </select>
          )}
          <Link href={`/students/${id}`} className="btn-secondary">
            ← Back
          </Link>
          <button onClick={() => window.print()} className="btn-primary px-6">
            🖨️ Print
          </button>
        </div>
      </div>
      <ScholarshipForm student={merged} />
    </div>
  );
}
