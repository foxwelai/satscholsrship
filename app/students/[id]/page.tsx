"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import ImageLightbox from "@/components/ImageLightbox";
import { useSession } from "@/lib/useSession";

type Application = {
  id: number;
  financialYear: string;
  category: string;
  currentClass: string;
  courseName: string;
  pincode: string;
  location: string;
  prevYearMarks: string;
  annualFee: string;
  status: string;
  closed: boolean;
  rejectionReason: string;
  approvedAt: string | null;
  closedAt: string | null;
};

type StudentDetail = {
  id: number;
  student_id: string;
  pete_id: number;
  pete_name: string;
  reg_year: number;
  name: string;
  mobile: string;
  dob: string;
  aadhar: string;
  school_name: string;
  father_name: string;
  father_occupation: string;
  address: string;
  mother_name: string;
  family_income: string;
  contact_phone: string;
  bank_account: string;
  bank_name: string;
  bank_branch: string;
  ifsc: string;
  photo_path: string;
  passbook_path: string;
  applications: Application[];
};

function fmtDob(value: string) {
  if (!value) return "";
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : d.toLocaleDateString("en-IN");
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold tracking-wider text-stone-400 uppercase">{label}</p>
      <p className="mt-0.5 text-sm font-medium break-words text-stone-800">{value || "—"}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card overflow-hidden">
      <div className="card-header">
        <span className="accent-bar" />
        <h2 className="card-title">{title}</h2>
      </div>
      <div className="grid gap-4 p-5 sm:grid-cols-2 md:grid-cols-3">{children}</div>
    </section>
  );
}

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const session = useSession();
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/students/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Not found"))))
      .then((data) => alive && setStudent(data))
      .catch(() => alive && setNotFound(true));
    return () => {
      alive = false;
    };
  }, [id]);

  async function handleDelete() {
    if (!confirm(`Delete student ${student?.student_id} (${student?.name})? This cannot be undone.`))
      return;
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

  const canEdit = session?.role !== "staff_admin";
  // Every correction goes through an application, so "edit" from here means
  // opening the year you want to fix. The newest one is the usual choice.
  const latestApp = [...student.applications].sort((a, b) =>
    a.financialYear < b.financialYear ? 1 : -1
  )[0];
  const isPdf = student.passbook_path.endsWith(".pdf");

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
          {canEdit && latestApp && (
            <Link href={`/students/${id}/applications/${latestApp.id}`} className="btn-primary">
              ✎ Edit Record
            </Link>
          )}
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
                  <th className="py-2.5 pr-4">Course</th>
                  <th className="py-2.5 pr-4">Location</th>
                  <th className="py-2.5 pr-4">Fee</th>
                  <th className="py-2.5 pr-4">Status</th>
                  <th className="py-2.5 pr-4">Closed</th>
                  <th className="py-2.5 pr-5"></th>
                </tr>
              </thead>
              <tbody>
                {student.applications.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-cream-200/70 last:border-0 hover:bg-gold-100/30"
                  >
                    <td className="px-5 py-2.5 font-semibold text-maroon-900">{a.financialYear}</td>
                    <td className="py-2.5 pr-4">{a.currentClass}</td>
                    <td className="py-2.5 pr-4">{a.category}</td>
                    <td className="py-2.5 pr-4">{a.courseName || "—"}</td>
                    <td className="py-2.5 pr-4 text-xs">
                      {[a.location, a.pincode].filter(Boolean).join(" — ") || "—"}
                    </td>
                    <td className="py-2.5 pr-4">{a.annualFee}</td>
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
                      {a.status === "Rejected" && a.rejectionReason && (
                        <p className="mt-1 max-w-52 text-[11px] leading-snug text-red-600">
                          {a.rejectionReason}
                        </p>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-xs font-semibold text-stone-500">
                      {a.closed ? "✓ Closed" : "—"}
                    </td>
                    <td className="py-2.5 pr-5 text-right">
                      {canEdit && (
                        <Link
                          href={`/students/${id}/applications/${a.id}`}
                          className="text-xs font-bold text-navy-700 hover:underline"
                          title="Edit this year — and every detail of the student's record"
                        >
                          Edit →
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cream-300 bg-cream-50/70 px-4 py-3">
        <p className="text-sm text-stone-500">
          This is a read-only record.{" "}
          {canEdit
            ? "Open a year with Edit above to change any of these details."
            : "Staff admins can submit new applications but cannot edit existing records."}
        </p>
      </div>

      <div className="space-y-5">
        <Section title="A) Student Details">
          <Field label="Pete" value={student.pete_name} />
          <Field label="Student's Name" value={student.name} />
          <Field label="Mobile No." value={student.mobile} />
          <Field label="Date of Birth" value={fmtDob(student.dob)} />
          <Field label="Aadhar Number" value={student.aadhar} />
          <Field label="School / College" value={student.school_name} />
          <div>
            <p className="text-[11px] font-bold tracking-wider text-stone-400 uppercase">
              Student Photo
            </p>
            {student.photo_path ? (
              <button
                type="button"
                onClick={() => setLightbox(student.photo_path)}
                className="mt-1.5 h-28 w-24 cursor-zoom-in overflow-hidden rounded-xl ring-1 ring-cream-300"
                title="Click to enlarge"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={student.photo_path}
                  alt={student.name}
                  className="h-full w-full object-cover"
                />
              </button>
            ) : (
              <p className="mt-0.5 text-sm font-medium text-stone-800">—</p>
            )}
          </div>
        </Section>

        <Section title="B) Family Details">
          <Field label="Father's Name" value={student.father_name} />
          <Field label="Father's Occupation" value={student.father_occupation} />
          <Field label="Mother's Name" value={student.mother_name} />
          <Field label="Residential Address" value={student.address} />
          <Field label="Family Annual Income (₹)" value={student.family_income} />
          <Field label="Contact Phone" value={student.contact_phone} />
        </Section>

        <Section title="C) Student's Bank Details">
          <Field label="Bank Account Number" value={student.bank_account} />
          <Field label="IFSC Code" value={student.ifsc} />
          <Field label="Bank Name" value={student.bank_name} />
          <Field label="Branch" value={student.bank_branch} />
          <div>
            <p className="text-[11px] font-bold tracking-wider text-stone-400 uppercase">
              Bank Pass Book
            </p>
            {student.passbook_path ? (
              isPdf ? (
                <a
                  href={student.passbook_path}
                  target="_blank"
                  className="mt-0.5 inline-block text-sm font-bold text-maroon-700 underline"
                >
                  View PDF
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => setLightbox(student.passbook_path)}
                  className="mt-1.5 h-28 w-24 cursor-zoom-in overflow-hidden rounded-xl ring-1 ring-cream-300"
                  title="Click to enlarge"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={student.passbook_path}
                    alt="Bank pass book"
                    className="h-full w-full object-cover"
                  />
                </button>
              )
            ) : (
              <p className="mt-0.5 text-sm font-medium text-stone-800">—</p>
            )}
          </div>
        </Section>
      </div>

      {lightbox && <ImageLightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}
