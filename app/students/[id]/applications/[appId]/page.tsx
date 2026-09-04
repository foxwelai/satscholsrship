"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import StudentForm, { StudentFormValues } from "@/components/StudentForm";
import {
  ApplicationFields,
  ApplicationValues,
  applicationValues,
  validateApplication,
} from "@/components/ApplicationForm";
import RejectReasonModal from "@/components/RejectReasonModal";
import { ReviewApplication } from "@/components/ReviewApplicationModal";
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

// The student's own details, straight from /api/students/[id] — the named
// fields are what this page reads, the rest is fed to StudentForm as-is.
type StudentDetail = {
  id: number;
  student_id: string;
  name: string;
  pete_name: string;
  applications: Application[];
  [key: string]: unknown;
};

function fmtDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString("en-IN") : "";
}

export default function EditApplicationPage() {
  const { id, appId } = useParams<{ id: string; appId: string }>();
  const router = useRouter();
  const session = useSession();
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [appValues, setAppValues] = useState<ApplicationValues | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [flash, setFlash] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [pending, setPending] = useState<ReviewApplication[]>([]);
  // Bumped after every save so the form remounts from the refetched record —
  // what you see afterwards is what the server actually stored, not what was
  // typed into it.
  const [formVersion, setFormVersion] = useState(0);

  // `reseed` refills the editors from the freshly loaded record. A decision
  // (approve, reject, revoke) leaves them alone, so unsaved edits survive it.
  const apply = useCallback(
    (data: StudentDetail, reseed: boolean) => {
      setStudent(data);
      const app = data.applications?.find((a) => a.id === Number(appId));
      if (app && reseed) {
        setAppValues(
          applicationValues({
            financial_year: app.financialYear,
            category: app.category,
            current_class: app.currentClass,
            course_name: app.courseName,
            pincode: app.pincode,
            location: app.location,
            prev_year_marks: app.prevYearMarks,
            annual_fee: app.annualFee,
          })
        );
        setFormVersion((v) => v + 1);
      }
    },
    [appId]
  );

  useEffect(() => {
    let alive = true;
    fetch(`/api/students/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Not found"))))
      .then((data: StudentDetail) => alive && apply(data, true))
      .catch(() => alive && setNotFound(true));
    return () => {
      alive = false;
    };
  }, [id, apply]);

  // Refetch after a save or a decision, from the event handlers only.
  async function reload(reseed: boolean) {
    const res = await fetch(`/api/students/${id}`);
    if (res.ok) apply(await res.json(), reseed);
  }

  // Refetched on every application we land on, so the "next up" queue stays
  // accurate as the super admin walks through it.
  useEffect(() => {
    if (session?.role !== "super_admin") return;
    fetch("/api/admin/applications")
      .then((r) => r.json())
      .then((data) => setPending(data.applications || []))
      .catch(() => {});
  }, [session, appId]);

  function announce(message: string) {
    setFlash(message);
    setTimeout(() => setFlash(""), 3000);
  }

  // One save for the whole record: the student's permanent details and this
  // year's application together, whatever the application's status is.
  async function saveAll(studentValues: StudentFormValues, intent: string): Promise<string | null> {
    const approveAndClose = intent === "approve_close";
    if (!appValues) return "Application not loaded yet";
    const problem = validateApplication(appValues);
    if (problem) return problem;
    setError("");

    // Pincode and place are application columns — they are saved with the
    // application below. Sent to the students endpoint they would land on the
    // student's *latest* year, which is not necessarily this one.
    const studentPayload: StudentFormValues = { ...studentValues };
    delete studentPayload.pincode;
    delete studentPayload.location;

    const studentRes = await fetch(`/api/students/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(studentPayload),
    });
    const studentSaved = await studentRes.json().catch(() => ({}));
    if (!studentRes.ok) {
      return studentSaved.error ?? "Failed to save the student's details";
    }
    // Moving a student to another pete reissues their number there, so say so
    // rather than letting the ID quietly change under them.
    const reissuedId =
      studentSaved.student_id && studentSaved.student_id !== student?.student_id
        ? (studentSaved.student_id as string)
        : null;

    const appRes = await fetch(`/api/applications/${appId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...appValues,
        action: approveAndClose ? "approve_close" : undefined,
      }),
    });
    if (!appRes.ok) {
      const data = await appRes.json().catch(() => ({}));
      return data.error ?? "The student's details were saved, but the application was not";
    }

    await reload(true);
    announce(
      reissuedId
        ? `✓ All changes saved — moved pete, new Student ID ${reissuedId}`
        : approveAndClose
          ? "✓ Saved, approved and closed"
          : "✓ All changes saved"
    );
    return null;
  }

  // Approve / reject / revoke go through the same super-admin endpoints the
  // approvals queue uses, so a decision made here behaves identically there.
  async function decide(kind: "approve" | "revoke"): Promise<void> {
    const question =
      kind === "approve"
        ? "Approve this application?"
        : "Put this application back into the pending queue for a fresh review?";
    if (!confirm(question)) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/applications/${appId}/${kind}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update application");
      await reload(false);
      announce(kind === "approve" ? "✓ Application approved" : "↩ Rejection revoked");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update application");
    } finally {
      setBusy(false);
    }
  }

  async function reject(reason: string): Promise<string | null> {
    try {
      const res = await fetch(`/api/admin/applications/${appId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) return data.error ?? "Failed to reject application";
      setRejecting(false);
      await reload(false);
      announce("✗ Application rejected");
      return null;
    } catch {
      return "Failed to reject application";
    }
  }

  async function handleReopen() {
    if (!confirm("Reopen this application for further changes?")) return;
    setBusy(true);
    await fetch(`/api/applications/${appId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reopen" }),
    });
    await reload(false);
    setBusy(false);
  }

  if (session?.role === "staff_admin") {
    return (
      <div className="card mx-auto max-w-lg overflow-hidden p-10 text-center">
        <p className="text-4xl">🔒</p>
        <h1 className="mt-4 font-display text-xl text-maroon-800">Access restricted</h1>
        <p className="mt-2 text-sm text-stone-500">
          Staff admins can submit new applications but cannot edit existing ones.
        </p>
        <button onClick={() => router.back()} className="btn-secondary mt-6">
          ← Go back
        </button>
      </div>
    );
  }

  if (notFound) return <p className="text-red-700">Student not found.</p>;
  if (!student || !appValues) return <p className="text-gray-500">Loading…</p>;
  const app = student.applications.find((a) => a.id === Number(appId));
  if (!app) return <p className="text-red-700">Application not found.</p>;

  const isSuperAdmin = session?.role === "super_admin";
  const queueIndex = pending.findIndex((p) => p.id === Number(appId));
  const nextPending = queueIndex >= 0 ? pending[queueIndex + 1] : pending[0];

  const statusBadge =
    app.status === "Approved" ? "badge-green" : app.status === "Rejected" ? "badge-red" : "badge-amber";
  const statusNote =
    app.status === "Approved"
      ? `Approved${app.approvedAt ? ` on ${fmtDate(app.approvedAt)}` : ""} — details can still be corrected below.`
      : app.status === "Rejected"
        ? app.rejectionReason || "Rejected."
        : app.status === "Pending Approval"
          ? "Awaiting super admin approval."
          : "This year's scholarship is marked closed.";

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">
          {student.name} — {app.financialYear}
        </h1>
        <p className="page-subtitle">
          <span className="font-mono font-semibold text-maroon-800">{student.student_id}</span> ·{" "}
          {student.pete_name} Pete · editing every detail of this year&apos;s application
        </p>
      </div>

      {flash && <div className="alert-success mb-4">{flash}</div>}
      {error && <div className="alert-error mb-4">{error}</div>}

      <div className="card mb-5 flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className={statusBadge}>{app.status}</span>
          {app.closed && (
            <span className="rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-600">
              🔒 Closed
            </span>
          )}
          <p
            className={`text-sm ${app.status === "Rejected" ? "font-medium text-red-600" : "text-stone-500"}`}
          >
            {statusNote}
          </p>
        </div>
        {isSuperAdmin && (
          <div className="flex flex-wrap gap-2">
            {app.status !== "Approved" && (
              <button
                onClick={() => decide("approve")}
                disabled={busy}
                className="btn-success px-3.5 py-2 text-xs"
              >
                ✓ Approve
              </button>
            )}
            {app.status !== "Rejected" && (
              <button
                onClick={() => setRejecting(true)}
                disabled={busy}
                className="btn-danger-outline px-3.5 py-2 text-xs"
                title="Reject this application with a reason — an approved one is withdrawn"
              >
                ✗ Reject{app.status === "Approved" ? " (withdraw approval)" : ""}
              </button>
            )}
            {app.status === "Rejected" && (
              <button
                onClick={() => decide("revoke")}
                disabled={busy}
                className="btn-secondary px-3.5 py-2 text-xs"
                title="Undo the rejection and send it back to the pending queue"
              >
                ↩ Revoke rejection
              </button>
            )}
            {app.closed && (
              <button
                onClick={handleReopen}
                disabled={busy}
                className="btn-secondary px-3.5 py-2 text-xs"
              >
                Reopen
              </button>
            )}
          </div>
        )}
      </div>

      <StudentForm
        key={formVersion}
        initial={student}
        session={session}
        hideLocation
        submitLabel="Save All Changes"
        onSubmit={saveAll}
        actions={(saving) =>
          isSuperAdmin && !app.closed ? (
            <button
              type="submit"
              value="approve_close"
              disabled={saving}
              className="btn-success px-7 py-3.5 text-base"
              title="Save these changes, then mark this year's scholarship Approved and Closed"
            >
              ✓ Save, Approve &amp; Close
            </button>
          ) : null
        }
      >
        <ApplicationFields
          values={appValues}
          onChange={(patch) => setAppValues((prev) => ({ ...prev!, ...patch }))}
          lockFinancialYear
          title={`Scholarship Application — ${app.financialYear}`}
        />
      </StudentForm>

      {isSuperAdmin && pending.length > 0 && (
        <div className="card mt-4 flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm text-stone-500">
            {pending.length} application{pending.length !== 1 ? "s" : ""} pending approval
            {nextPending && (
              <>
                {" · next up "}
                <span className="font-mono font-semibold text-maroon-800">
                  {nextPending.student_id}
                </span>{" "}
                <span className="font-medium text-stone-600">{nextPending.name}</span>
              </>
            )}
          </p>
          <div className="flex gap-2">
            <Link href="/admin/applications" className="btn-secondary px-3.5 py-2 text-xs">
              Approvals queue
            </Link>
            {nextPending && (
              <button
                onClick={() =>
                  router.push(
                    `/students/${nextPending.db_student_id}/applications/${nextPending.id}`
                  )
                }
                className="btn-navy px-3.5 py-2 text-xs"
              >
                Next application →
              </button>
            )}
          </div>
        </div>
      )}

      {rejecting && (
        <RejectReasonModal
          title={`Reject ${student.student_id} — ${app.financialYear}`}
          description={
            app.status === "Approved"
              ? "This application is currently approved. Rejecting it withdraws the approval, clears the closing mark, and records the reason below against the application."
              : "The reason is recorded against the application and shown wherever it is listed."
          }
          initialReason={app.rejectionReason}
          confirmLabel={app.status === "Approved" ? "✗ Withdraw & Reject" : "✗ Reject application"}
          onCancel={() => setRejecting(false)}
          onConfirm={reject}
        />
      )}
    </div>
  );
}
