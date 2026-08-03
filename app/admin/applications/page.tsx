"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/useSession";
import ImageLightbox from "@/components/ImageLightbox";

type PendingApplication = {
  id: number;
  db_student_id: number;
  student_id: string;
  name: string;
  pete_name: string;
  photo_path: string;
  category: string;
  current_class: string;
  course_name: string;
  pincode: string;
  location: string;
  prev_year_marks: string;
  annual_fee: string;
  scholarship_amount: number;
  financial_year: string;
  created_at: string;
};

export default function AdminApplicationsPage() {
  const session = useSession();
  const [applications, setApplications] = useState<PendingApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<PendingApplication | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/applications")
      .then((r) => r.json())
      .then((data) => {
        setApplications(data.applications || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (session && session.role !== "super_admin") {
    return (
      <div className="card mx-auto max-w-md p-10 text-center">
        <p className="text-4xl">🔒</p>
        <p className="mt-4 text-sm text-stone-600">Only super admins can approve applications.</p>
      </div>
    );
  }

  async function handleApprove(appId: number) {
    setProcessing(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/applications/${appId}/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to approve");
      setApplications((prev) => prev.filter((a) => a.id !== appId));
      setSelectedApp(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to approve application");
    } finally {
      setProcessing(false);
    }
  }

  async function handleReject(appId: number) {
    if (!rejectionReason.trim()) {
      setError("Please provide a rejection reason");
      return;
    }
    setProcessing(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/applications/${appId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectionReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to reject");
      setApplications((prev) => prev.filter((a) => a.id !== appId));
      setSelectedApp(null);
      setRejectionReason("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reject application");
    } finally {
      setProcessing(false);
    }
  }

  function closeModal() {
    setSelectedApp(null);
    setRejectionReason("");
    setError("");
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Application Approvals</h1>
        <p className="page-subtitle">
          {applications.length} pending application{applications.length !== 1 ? "s" : ""} awaiting
          your review
        </p>
      </div>

      {loading ? (
        <p className="text-stone-400">Loading applications…</p>
      ) : applications.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-4xl">✅</p>
          <p className="mt-4 text-sm text-stone-500">All applications have been reviewed!</p>
        </div>
      ) : (
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Photo</th>
                <th>Student ID</th>
                <th>Name</th>
                <th>Pete</th>
                <th>Category</th>
                <th>Class</th>
                <th>FY</th>
                <th className="text-right!">Amount (₹)</th>
                <th>Applied</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id}>
                  <td>
                    {app.photo_path ? (
                      <button
                        type="button"
                        onClick={() => setLightbox(app.photo_path)}
                        className="h-10 w-10 cursor-zoom-in overflow-hidden rounded-full ring-1 ring-cream-300"
                        title="Click to enlarge"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={app.photo_path} alt={app.name} className="h-full w-full object-cover" />
                      </button>
                    ) : (
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-cream-100 text-stone-300">
                        👤
                      </span>
                    )}
                  </td>
                  <td>
                    <Link
                      href={`/students/${app.db_student_id}`}
                      className="font-mono text-[13px] font-bold text-maroon-700 hover:underline"
                    >
                      {app.student_id}
                    </Link>
                  </td>
                  <td className="font-medium">{app.name}</td>
                  <td>{app.pete_name}</td>
                  <td>{app.category}</td>
                  <td className="text-sm">
                    {app.current_class}
                    {app.course_name ? ` · ${app.course_name}` : ""}
                  </td>
                  <td>{app.financial_year}</td>
                  <td className="text-right font-semibold text-navy-800">
                    ₹{app.scholarship_amount.toLocaleString("en-IN")}
                  </td>
                  <td className="text-xs text-stone-500">
                    {new Date(app.created_at).toLocaleDateString("en-IN")}
                  </td>
                  <td className="text-right">
                    <button
                      onClick={() => setSelectedApp(app)}
                      className="cursor-pointer text-xs font-bold text-navy-700 hover:underline"
                    >
                      Review →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card max-h-[90vh] w-full max-w-2xl overflow-auto">
            <div className="card-header justify-between">
              <div className="flex items-center gap-2.5">
                <span className="accent-bar" />
                <h2 className="card-title">Review — {selectedApp.student_id}</h2>
              </div>
              <button
                onClick={closeModal}
                className="cursor-pointer text-xl font-bold text-stone-400 hover:text-stone-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4 p-6">
              {error && <div className="alert-error">{error}</div>}

              <div className="flex items-start gap-4">
                {selectedApp.photo_path ? (
                  <button
                    type="button"
                    onClick={() => setLightbox(selectedApp.photo_path)}
                    className="h-28 w-24 shrink-0 cursor-zoom-in overflow-hidden rounded-xl ring-1 ring-cream-300"
                    title="Click to enlarge"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedApp.photo_path}
                      alt={selectedApp.name}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ) : (
                  <span className="grid h-28 w-24 shrink-0 place-items-center rounded-xl bg-cream-100 text-3xl text-stone-300">
                    👤
                  </span>
                )}
                <div className="grid flex-1 grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs font-bold text-stone-400 uppercase">Name</p>
                    <p className="font-medium">{selectedApp.name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-stone-400 uppercase">Pete</p>
                    <p className="font-medium">{selectedApp.pete_name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-stone-400 uppercase">Category</p>
                    <p className="font-medium">{selectedApp.category}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-stone-400 uppercase">Class</p>
                    <p className="font-medium">{selectedApp.current_class}</p>
                  </div>
                  {selectedApp.course_name && (
                    <div>
                      <p className="text-xs font-bold text-stone-400 uppercase">Course</p>
                      <p className="font-medium">{selectedApp.course_name}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold text-stone-400 uppercase">Financial Year</p>
                    <p className="font-medium">{selectedApp.financial_year}</p>
                  </div>
                  {selectedApp.prev_year_marks && (
                    <div>
                      <p className="text-xs font-bold text-stone-400 uppercase">Previous Marks</p>
                      <p className="font-medium">{selectedApp.prev_year_marks}</p>
                    </div>
                  )}
                  {selectedApp.annual_fee && (
                    <div>
                      <p className="text-xs font-bold text-stone-400 uppercase">Annual Fee</p>
                      <p className="font-medium">₹{selectedApp.annual_fee}</p>
                    </div>
                  )}
                  {(selectedApp.location || selectedApp.pincode) && (
                    <div className="col-span-2">
                      <p className="text-xs font-bold text-stone-400 uppercase">Location</p>
                      <p className="font-medium">
                        {[selectedApp.location, selectedApp.pincode].filter(Boolean).join(" — ")}
                      </p>
                    </div>
                  )}
                  <div className="col-span-2">
                    <p className="text-xs font-bold text-stone-400 uppercase">Scholarship Amount</p>
                    <p className="text-lg font-semibold text-navy-800">
                      ₹{selectedApp.scholarship_amount.toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-cream-200 pt-4">
                <label className="block">
                  <span className="label">Rejection Reason (required to reject)</span>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g. Income certificate missing, marks card not attached…"
                    className="input min-h-24"
                  />
                </label>
              </div>

              <div className="flex gap-3 border-t border-cream-200 pt-4">
                <button
                  onClick={() => handleApprove(selectedApp.id)}
                  disabled={processing}
                  className="btn-success flex-1"
                >
                  {processing ? "Processing…" : "✓ Approve"}
                </button>
                <button
                  onClick={() => handleReject(selectedApp.id)}
                  disabled={processing || !rejectionReason.trim()}
                  className="btn-danger-outline flex-1"
                >
                  {processing ? "Processing…" : "✗ Reject"}
                </button>
                <button onClick={closeModal} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {lightbox && <ImageLightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}
