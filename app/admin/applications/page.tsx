"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/useSession";
import ImageLightbox from "@/components/ImageLightbox";
import ReviewApplicationModal, { ReviewApplication } from "@/components/ReviewApplicationModal";

type AdminApplication = ReviewApplication & {
  status: string;
  closed: boolean;
  rejection_reason: string;
  approved_at: string | null;
  updated_at: string;
};

const TABS = [
  { key: "Pending Approval", label: "Pending", countKey: "pending" },
  { key: "Approved", label: "Approved", countKey: "approved" },
  { key: "Rejected", label: "Rejected", countKey: "rejected" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const EMPTY_STATE: Record<TabKey, { icon: string; text: string }> = {
  "Pending Approval": { icon: "✅", text: "All applications have been reviewed!" },
  Approved: { icon: "🪔", text: "No applications have been approved yet." },
  Rejected: { icon: "📭", text: "No applications have been rejected." },
};

// Page numbers with gaps once the list gets long: 1 … 6 7 8 … 24
function pageList(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const wanted = [1, total, current, current - 1, current + 1].filter((n) => n >= 1 && n <= total);
  const nums = Array.from(new Set(wanted)).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1] > 1) out.push("…");
    out.push(n);
  });
  return out;
}

function fmtDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString("en-IN") : "—";
}

export default function AdminApplicationsPage() {
  const session = useSession();
  const [tab, setTab] = useState<TabKey>("Pending Approval");
  const [page, setPage] = useState(1);
  const [applications, setApplications] = useState<AdminApplication[] | null>(null);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [total, setTotal] = useState(0);
  const [perPage, setPerPage] = useState(25);
  const [selectedApp, setSelectedApp] = useState<AdminApplication | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  // Bumped to re-run the fetch below after a decision changes the data.
  const [reloadKey, setReloadKey] = useState(0);

  // The pending tab stays unpaginated — it is a work queue, and the review
  // flow on the student and application pages walks the whole list.
  const isPaginated = tab !== "Pending Approval";

  useEffect(() => {
    let alive = true;
    const params = new URLSearchParams({ status: tab });
    if (isPaginated) params.set("page", String(page));
    fetch(`/api/admin/applications?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return;
        setApplications(data.applications ?? []);
        setCounts(data.counts ?? { pending: 0, approved: 0, rejected: 0 });
        setTotal(data.total ?? 0);
        setPerPage(data.perPage || 25);
        // Deciding on the last row of a page can leave it empty — step back.
        if (page > 1 && (data.applications ?? []).length === 0) setPage((p) => p - 1);
      })
      .catch(() => {
        if (!alive) return;
        setApplications([]);
        setError("Failed to load applications");
      });
    return () => {
      alive = false;
    };
  }, [tab, page, isPaginated, reloadKey]);

  // Re-runs the fetch above; called from event handlers only.
  function reload() {
    setApplications(null);
    setReloadKey((k) => k + 1);
  }

  if (session && session.role !== "super_admin") {
    return (
      <div className="card mx-auto max-w-md p-10 text-center">
        <p className="text-4xl">🔒</p>
        <p className="mt-4 text-sm text-stone-600">Only super admins can approve applications.</p>
      </div>
    );
  }

  // Approving or revoking a rejected application, straight from the list.
  async function decideRejected(app: AdminApplication, kind: "approve" | "revoke") {
    const question =
      kind === "approve"
        ? `Approve ${app.student_id} (${app.name}) after all? The rejection reason will be cleared.`
        : `Put ${app.student_id} (${app.name}) back into the pending queue for a fresh review?`;
    if (!confirm(question)) return;
    setBusyId(app.id);
    setError("");
    try {
      const res = await fetch(`/api/admin/applications/${app.id}/${kind}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update application");
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update application");
    } finally {
      setBusyId(null);
    }
  }

  function switchTab(next: TabKey) {
    setTab(next);
    setPage(1);
    setApplications(null);
    setError("");
  }

  function goToPage(next: number) {
    setPage(next);
    setApplications(null);
  }

  const totalPages = isPaginated ? Math.max(1, Math.ceil(total / perPage)) : 1;
  const lastColumn =
    tab === "Pending Approval" ? "Applied" : tab === "Approved" ? "Approved On" : "Reason";

  return (
    <div>
      <div className="mb-5">
        <h1 className="page-title">Application Approvals</h1>
        <p className="page-subtitle">
          {counts.pending} pending application{counts.pending !== 1 ? "s" : ""} awaiting your review
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-xl border border-cream-300 bg-white p-1 shadow-sm">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => switchTab(t.key)}
              className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${
                tab === t.key
                  ? "bg-gradient-to-b from-maroon-700 to-maroon-800 text-white shadow-sm"
                  : "text-maroon-800 hover:bg-maroon-50"
              }`}
            >
              {t.label}
              <span className={tab === t.key ? "ml-1.5 text-white/70" : "ml-1.5 text-stone-400"}>
                {counts[t.countKey]}
              </span>
            </button>
          ))}
        </div>
        {isPaginated && applications && total > 0 && (
          <p className="text-xs text-stone-500">
            Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
          </p>
        )}
      </div>

      {error && <div className="alert-error mb-4">{error}</div>}

      {!applications ? (
        <p className="text-stone-400">Loading applications…</p>
      ) : applications.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-4xl">{EMPTY_STATE[tab].icon}</p>
          <p className="mt-4 text-sm text-stone-500">{EMPTY_STATE[tab].text}</p>
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
                <th>{lastColumn}</th>
                {tab !== "Approved" && <th></th>}
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
                  {tab === "Rejected" ? (
                    <td className="max-w-64 text-xs leading-snug text-red-600">
                      {app.rejection_reason || "—"}
                    </td>
                  ) : (
                    <td className="text-xs text-stone-500">
                      {fmtDate(tab === "Approved" ? app.approved_at : app.created_at)}
                    </td>
                  )}
                  {tab === "Pending Approval" && (
                    <td className="text-right">
                      <button
                        onClick={() => setSelectedApp(app)}
                        className="cursor-pointer text-xs font-bold text-navy-700 hover:underline"
                      >
                        Review →
                      </button>
                    </td>
                  )}
                  {tab === "Rejected" && (
                    <td className="text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => decideRejected(app, "approve")}
                          disabled={busyId === app.id}
                          className="cursor-pointer text-xs font-bold text-emerald-700 hover:underline disabled:opacity-50"
                          title="Approve this application despite the earlier rejection"
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => decideRejected(app, "revoke")}
                          disabled={busyId === app.id}
                          className="cursor-pointer text-xs font-bold text-navy-700 hover:underline disabled:opacity-50"
                          title="Undo the rejection and send it back to the pending queue"
                        >
                          ↩ Revoke
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isPaginated && applications && totalPages > 1 && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
          <button
            onClick={() => goToPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="cursor-pointer rounded-lg border border-cream-300 bg-white px-3 py-1.5 text-sm font-semibold text-maroon-800 shadow-sm hover:bg-maroon-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← Prev
          </button>
          {pageList(page, totalPages).map((n, i) =>
            n === "…" ? (
              <span key={`gap-${i}`} className="px-1.5 text-sm text-stone-400">
                …
              </span>
            ) : (
              <button
                key={n}
                onClick={() => goToPage(n)}
                className={`min-w-9 cursor-pointer rounded-lg px-3 py-1.5 text-sm font-semibold shadow-sm transition ${
                  n === page
                    ? "bg-gradient-to-b from-maroon-700 to-maroon-800 text-white"
                    : "border border-cream-300 bg-white text-maroon-800 hover:bg-maroon-50"
                }`}
              >
                {n}
              </button>
            )
          )}
          <button
            onClick={() => goToPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="cursor-pointer rounded-lg border border-cream-300 bg-white px-3 py-1.5 text-sm font-semibold text-maroon-800 shadow-sm hover:bg-maroon-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}

      {selectedApp && (
        <ReviewApplicationModal
          app={selectedApp}
          onClose={() => setSelectedApp(null)}
          onDecided={() => {
            setSelectedApp(null);
            reload();
          }}
        />
      )}

      {lightbox && <ImageLightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}
