"use client";

import { useState } from "react";

// Rejecting is never silent: the reason is required and is what the student
// and the pete admin are shown afterwards. Used both to reject a pending
// application and to withdraw one that was already approved.
export default function RejectReasonModal({
  title,
  description,
  confirmLabel = "✗ Reject application",
  initialReason = "",
  onCancel,
  onConfirm,
}: {
  title: string;
  description?: string;
  confirmLabel?: string;
  initialReason?: string;
  onCancel: () => void;
  // Returns an error message, or null once the rejection is saved.
  onConfirm: (reason: string) => Promise<string | null>;
}) {
  const [reason, setReason] = useState(initialReason);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    const trimmed = reason.trim();
    if (!trimmed) {
      setError("Please provide a rejection reason");
      return;
    }
    setBusy(true);
    setError("");
    const err = await onConfirm(trimmed);
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="card w-full max-w-lg overflow-hidden">
        <div className="card-header justify-between">
          <div className="flex items-center gap-2.5">
            <span className="accent-bar" />
            <h2 className="card-title">{title}</h2>
          </div>
          <button
            onClick={onCancel}
            className="cursor-pointer text-xl font-bold text-stone-400 hover:text-stone-600"
          >
            ✕
          </button>
        </div>
        <div className="space-y-4 p-6">
          {error && <div className="alert-error">{error}</div>}
          {description && <p className="text-sm text-stone-500">{description}</p>}
          <label className="block">
            <span className="label">
              Rejection Reason <span className="text-maroon-700">*</span>
            </span>
            <textarea
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Income certificate missing, marks card not attached…"
              className="input min-h-24"
            />
          </label>
          <div className="flex gap-3 border-t border-cream-200 pt-4">
            <button
              onClick={confirm}
              disabled={busy || !reason.trim()}
              className="btn-danger-outline flex-1"
            >
              {busy ? "Processing…" : confirmLabel}
            </button>
            <button onClick={onCancel} disabled={busy} className="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
