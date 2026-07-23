"use client";

import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [currentYear, setCurrentYear] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/settings?key=current_academic_year")
      .then((r) => r.json())
      .then((data) => {
        setCurrentYear(data.value || "2026-27");
      })
      .catch(() => {
        setCurrentYear("2026-27");
      });
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "current_academic_year",
          value: currentYear,
        }),
      });
      if (response.ok) {
        setMessage("✓ Current academic year updated successfully");
      } else {
        setMessage("✗ Failed to save settings");
      }
    } catch (error) {
      setMessage("✗ Error saving settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">Settings</h1>

      <div className="card max-w-md overflow-hidden">
        <div className="card-header">
          <span className="accent-bar" />
          <h2 className="card-title">Academic Year Configuration</h2>
        </div>
        <div className="space-y-4 p-5">
          <label className="block">
            <span className="label">
              Current Academic Year <span className="text-maroon-700">*</span>
            </span>
            <input
              type="text"
              value={currentYear}
              onChange={(e) => setCurrentYear(e.target.value)}
              placeholder="e.g. 2026-27"
              className="input"
            />
            <p className="mt-2 text-xs text-stone-500">
              Format: YYYY-YY (e.g., 2026-27 for 2026-2027)
            </p>
          </label>

          {message && (
            <div className={`rounded-lg px-3 py-2 text-sm font-semibold ${
              message.includes("✓")
                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                : "bg-red-50 text-red-700 ring-1 ring-red-200"
            }`}>
              {message}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary w-full"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>

          <p className="text-xs text-stone-500">
            This sets the year displayed at the top of the Search Students page and controls the default
            filter for student listings.
          </p>
        </div>
      </div>
    </div>
  );
}
