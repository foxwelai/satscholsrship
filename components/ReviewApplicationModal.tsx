"use client";

import { useState } from "react";
import ImageLightbox from "@/components/ImageLightbox";

// One pending application, shaped exactly as /api/admin/applications returns it.
// Every page that can review an application feeds the modal from that endpoint,
// so the reviewer always sees the same fields (including the rate-derived
// scholarship amount) no matter where the review was started from.
export type ReviewApplication = {
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

export default function ReviewApplicationModal({
  app,
  onClose,
  onDecided,
}: {
  app: ReviewApplication;
  onClose: () => void;
  // Called after the decision is persisted — the host page decides where to go
  // next (approvals queue, next pending application, …).
  onDecided: (decision: "approved" | "rejected", app: ReviewApplication) => void;
}) {
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [lightbox, setLightbox] = useState<string | null>(null);

  async function handleApprove() {
    setProcessing(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/applications/${app.id}/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to approve");
      onDecided("approved", app);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to approve application");
    } finally {
      setProcessing(false);
    }
  }

  async function handleReject() {
    if (!rejectionReason.trim()) {
      setError("Please provide a rejection reason");
      return;
    }
    setProcessing(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/applications/${app.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectionReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to reject");
      onDecided("rejected", app);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reject application");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="card max-h-[90vh] w-full max-w-2xl overflow-auto">
          <div className="card-header justify-between">
            <div className="flex items-center gap-2.5">
              <span className="accent-bar" />
              <h2 className="card-title">Review — {app.student_id}</h2>
            </div>
            <button
              onClick={onClose}
              className="cursor-pointer text-xl font-bold text-stone-400 hover:text-stone-600"
            >
              ✕
            </button>
          </div>
          <div className="space-y-4 p-6">
            {error && <div className="alert-error">{error}</div>}

            <div className="flex items-start gap-4">
              {app.photo_path ? (
                <button
                  type="button"
                  onClick={() => setLightbox(app.photo_path)}
                  className="h-28 w-24 shrink-0 cursor-zoom-in overflow-hidden rounded-xl ring-1 ring-cream-300"
                  title="Click to enlarge"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={app.photo_path} alt={app.name} className="h-full w-full object-cover" />
                </button>
              ) : (
                <span className="grid h-28 w-24 shrink-0 place-items-center rounded-xl bg-cream-100 text-3xl text-stone-300">
                  👤
                </span>
              )}
              <div className="grid flex-1 grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs font-bold text-stone-400 uppercase">Name</p>
                  <p className="font-medium">{app.name}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-400 uppercase">Pete</p>
                  <p className="font-medium">{app.pete_name}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-400 uppercase">Category</p>
                  <p className="font-medium">{app.category}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-400 uppercase">Class</p>
                  <p className="font-medium">{app.current_class}</p>
                </div>
                {app.course_name && (
                  <div>
                    <p className="text-xs font-bold text-stone-400 uppercase">Course</p>
                    <p className="font-medium">{app.course_name}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold text-stone-400 uppercase">Financial Year</p>
                  <p className="font-medium">{app.financial_year}</p>
                </div>
                {app.prev_year_marks && (
                  <div>
                    <p className="text-xs font-bold text-stone-400 uppercase">Previous Marks</p>
                    <p className="font-medium">{app.prev_year_marks}</p>
                  </div>
                )}
                {app.annual_fee && (
                  <div>
                    <p className="text-xs font-bold text-stone-400 uppercase">Annual Fee</p>
                    <p className="font-medium">₹{app.annual_fee}</p>
                  </div>
                )}
                {(app.location || app.pincode) && (
                  <div className="col-span-2">
                    <p className="text-xs font-bold text-stone-400 uppercase">Location</p>
                    <p className="font-medium">
                      {[app.location, app.pincode].filter(Boolean).join(" — ")}
                    </p>
                  </div>
                )}
                <div className="col-span-2">
                  <p className="text-xs font-bold text-stone-400 uppercase">Scholarship Amount</p>
                  <p className="text-lg font-semibold text-navy-800">
                    ₹{app.scholarship_amount.toLocaleString("en-IN")}
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
              <button onClick={handleApprove} disabled={processing} className="btn-success flex-1">
                {processing ? "Processing…" : "✓ Approve"}
              </button>
              <button
                onClick={handleReject}
                disabled={processing || !rejectionReason.trim()}
                className="btn-danger-outline flex-1"
              >
                {processing ? "Processing…" : "✗ Reject"}
              </button>
              <button onClick={onClose} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

      {lightbox && <ImageLightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </>
  );
}
