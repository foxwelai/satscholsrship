"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/useSession";
import ImageLightbox from "@/components/ImageLightbox";
import ReviewApplicationModal, { ReviewApplication } from "@/components/ReviewApplicationModal";

export default function AdminApplicationsPage() {
  const session = useSession();
  const [applications, setApplications] = useState<ReviewApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<ReviewApplication | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

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

  function handleDecided(_decision: "approved" | "rejected", app: ReviewApplication) {
    setApplications((prev) => prev.filter((a) => a.id !== app.id));
    setSelectedApp(null);
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
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => setSelectedApp(app)}
                        className="cursor-pointer text-xs font-bold text-navy-700 hover:underline"
                      >
                        Review →
                      </button>
                      <Link
                        href={`/students/${app.db_student_id}/applications/${app.id}`}
                        className="text-xs font-bold text-stone-500 hover:underline"
                      >
                        Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedApp && (
        <ReviewApplicationModal
          app={selectedApp}
          onClose={() => setSelectedApp(null)}
          onDecided={handleDecided}
        />
      )}

      {lightbox && <ImageLightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}
