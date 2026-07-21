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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-red-900">
            {student.name}{" "}
            <span className="ml-2 rounded bg-red-800 px-2 py-0.5 font-mono text-sm text-white">
              {student.student_id}
            </span>
          </h1>
          <p className="text-sm text-gray-600">{student.pete_name} Pete</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/students/${id}/print`}
            className="rounded bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            🖨️ Print Application
          </Link>
          {session?.role === "super_admin" && (
            <button
              onClick={handleDelete}
              className="rounded border-2 border-red-600 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {saved && (
        <div className="mb-4 rounded border-2 border-green-500 bg-green-50 px-4 py-2 font-semibold text-green-800">
          ✓ Changes saved
        </div>
      )}

      <div className="mb-5 rounded-lg bg-white p-4 shadow">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-bold text-red-900">Scholarship Applications by Year</h2>
          <Link
            href={`/students/${id}/applications/new`}
            className="rounded bg-green-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-600"
          >
            + Add Next Year Application
          </Link>
        </div>
        {student.applications.length === 0 ? (
          <p className="text-sm text-gray-500">No applications recorded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-600">
                <th className="py-1.5">Financial Year</th>
                <th>Class</th>
                <th>Category</th>
                <th>Fee</th>
                <th>Status</th>
                <th>Closed</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {student.applications.map((a) => (
                <tr key={a.id} className="border-b last:border-0">
                  <td className="py-1.5 font-semibold">{a.financialYear}</td>
                  <td>{a.currentClass}</td>
                  <td>{a.category}</td>
                  <td>{a.annualFee}</td>
                  <td>
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-semibold ${
                        a.status === "Approved"
                          ? "bg-green-100 text-green-800"
                          : a.status === "Rejected"
                          ? "bg-red-100 text-red-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {a.status}
                    </span>
                  </td>
                  <td>{a.closed ? "✓ Closed" : "—"}</td>
                  <td>
                    <Link
                      href={`/students/${id}/applications/${a.id}`}
                      className="font-semibold text-blue-800 hover:underline"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <StudentForm initial={student} submitLabel="Save Changes" onSubmit={handleSubmit} session={session} />
    </div>
  );
}
