"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import StudentForm, { StudentFormValues } from "@/components/StudentForm";
import { useSession } from "@/lib/useSession";

type Application = {
  id: number;
  financialYear: string;
  category: string;
  currentClass: string;
  prevYearMarks: string;
  annualFee: string;
  scholarshipAmount: number;
  status: string;
  closed: boolean;
  approvedAt: string | null;
  closedAt: string | null;
};

type StudentDetail = StudentFormValues & {
  id: number;
  student_id: string;
  pete_id: number;
  pete_name: string;
  reg_year: number;
  applications: Application[];
};

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const session = useSession();
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [saved, setSaved] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/students/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setStudent)
      .catch(() => setNotFound(true));
  }, [id]);

  async function handleSubmit(values: StudentFormValues): Promise<string | null> {
    const res = await fetch(`/api/students/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const data = await res.json();
      return data.error ?? "Failed to save";
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    const fresh = await fetch(`/api/students/${id}`).then((r) => r.json());
    setStudent(fresh);
    return null;
  }

  async function handleDelete() {
    if (!confirm(`Delete student ${student?.student_id} (${student?.name})? This cannot be undone.`)) return;
    const res = await fetch(`/api/students/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "Failed to delete");
      return;
    }
    router.push("/students");
  }

  if (notFound) return <p className="text-red-700">Student not found.</p>;
  if (!student) return <p className="text-gray-500">Loading…</p>;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title flex flex-wrap items-center gap-3">
            {student.name}
            <span className="rounded-lg bg-gradient-to-b from-maroon-700 to-maroon-800 px-2.5 py-1 font-mono text-sm font-bold tracking-wider text-white shadow-sm">
              {student.student_id}
            </span>
          </h1>
          <p className="page-subtitle">🛕 {student.pete_name} Pete</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/students/${id}/print`} className="btn-navy">
            🖨️ Print Application
          </Link>
          {session?.role === "super_admin" && (
            <button onClick={handleDelete} className="btn-danger-outline">
              Delete
            </button>
          )}
        </div>
      </div>

      {saved && <div className="alert-success mb-4">✓ Changes saved</div>}

      <div className="card mb-6 overflow-hidden">
        <div className="card-header justify-between">
          <div className="flex items-center gap-2.5">
            <span className="accent-bar" />
            <h2 className="card-title">Scholarship Applications by Year</h2>
          </div>
          <Link
            href={`/students/${id}/applications/new`}
            className="btn-success px-3.5 py-1.5 text-xs"
          >
            + Add Next Year
          </Link>
        </div>
        {student.applications.length === 0 ? (
          <p className="p-5 text-sm text-stone-400">No applications recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cream-200 text-left text-[11px] font-bold tracking-wider text-stone-400 uppercase">
                  <th className="px-5 py-2.5">Financial Year</th>
                  <th className="py-2.5 pr-4">Class</th>
                  <th className="py-2.5 pr-4">Category</th>
                  <th className="py-2.5 pr-4">Fee</th>
                  <th className="py-2.5 pr-4">Scholarship</th>
                  <th className="py-2.5 pr-4">Status</th>
                  <th className="py-2.5 pr-4">Closed</th>
                  <th className="py-2.5 pr-5"></th>
                </tr>
              </thead>
              <tbody>
                {student.applications.map((a) => (
                  <tr key={a.id} className="border-b border-cream-200/70 last:border-0 hover:bg-gold-100/30">
                    <td className="px-5 py-2.5 font-semibold text-maroon-900">{a.financialYear}</td>
                    <td className="py-2.5 pr-4">{a.currentClass}</td>
                    <td className="py-2.5 pr-4">{a.category}</td>
                    <td className="py-2.5 pr-4">{a.annualFee}</td>
                    <td className="py-2.5 pr-4 font-semibold text-navy-800">
                      ₹{a.scholarshipAmount}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={
                          a.status === "Approved"
                            ? "badge-green"
                            : a.status === "Rejected"
                              ? "badge-red"
                              : "badge-amber"
                        }
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-xs font-semibold text-stone-500">
                      {a.closed ? "✓ Closed" : "—"}
                    </td>
                    <td className="py-2.5 pr-5 text-right">
                      <Link
                        href={`/students/${id}/applications/${a.id}`}
                        className="text-xs font-bold text-navy-700 hover:underline"
                      >
                        Edit →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <StudentForm initial={student} submitLabel="Save Changes" onSubmit={handleSubmit} session={session} />
    </div>
  );
}
