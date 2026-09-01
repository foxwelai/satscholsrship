"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { nextFinancialYear } from "@/lib/constants";

export default function SettingsPage() {
  const [currentYear, setCurrentYear] = useState("");
  const [renewalYear, setRenewalYear] = useState("");
  const [saving, setSaving] = useState(false);
  const [renewBusy, setRenewBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [renewMessage, setRenewMessage] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setCurrentYear(data.current_academic_year || "2026-27");
        setRenewalYear(data.renewal_year || "");
      })
      .catch(() => setCurrentYear("2026-27"));
  }, []);

  async function saveSetting(key: string, value: string) {
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    if (!res.ok) throw new Error("save failed");
  }

  async function handleSave() {
    if (!/^\d{4}-\d{2}$/.test(currentYear.trim())) {
      setMessage('✗ Year must look like "2026-27"');
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      await saveSetting("current_academic_year", currentYear.trim());
      setMessage("✓ Current academic year updated successfully");
    } catch {
      setMessage("✗ Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  const next = currentYear ? nextFinancialYear(currentYear) : "";

  async function openRenewals() {
    setRenewBusy(true);
    setRenewMessage("");
    try {
      await saveSetting("renewal_year", next);
      setRenewalYear(next);
      setRenewMessage(`✓ Renewals are now OPEN for ${next}`);
    } catch {
      setRenewMessage("✗ Failed to open renewals");
    } finally {
      setRenewBusy(false);
    }
  }

  async function closeRenewals() {
    if (!confirm(`Close renewals for ${renewalYear}? The Renew option will be disabled for everyone.`)) return;
    setRenewBusy(true);
    setRenewMessage("");
    try {
      await saveSetting("renewal_year", "");
      setRenewalYear("");
      setRenewMessage("✓ Renewals are now closed");
    } catch {
      setRenewMessage("✗ Failed to close renewals");
    } finally {
      setRenewBusy(false);
    }
  }

  function Msg({ text }: { text: string }) {
    if (!text) return null;
    return (
      <div
        className={`rounded-lg px-3 py-2 text-sm font-semibold ${
          text.includes("✓")
            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
            : "bg-red-50 text-red-700 ring-1 ring-red-200"
        }`}
      >
        {text}
      </div>
    );
  }

  const adminLinks = [
    {
      href: "/admin/users",
      icon: "🔐",
      title: "User Access",
      desc: "Add admins, set their role and pete, reset passwords",
    },
    {
      href: "/admin/rates",
      icon: "💰",
      title: "Scholarship Rates",
      desc: "Amount sanctioned per category for each financial year",
    },
    {
      href: "/petes",
      icon: "🛕",
      title: "Petes",
      desc: "Manage petes and the ID prefix each one issues",
    },
  ];

  return (
    <div>
      <h1 className="page-title">Settings</h1>
      <p className="page-subtitle mb-6">
        The portal only works with the current academic year — old years can never be selected.
      </p>

      <div className="mb-8 grid max-w-4xl gap-4 sm:grid-cols-3">
        {adminLinks.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="card group relative overflow-hidden p-5 transition hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-12px_rgba(61,10,11,0.25)]"
          >
            <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-maroon-700 via-gold-400 to-maroon-700 opacity-0 transition group-hover:opacity-100" />
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-maroon-50 text-xl ring-1 ring-maroon-100">
              {a.icon}
            </span>
            <p className="mt-3 font-display text-[15px] tracking-wide text-maroon-900">
              {a.title}
              <span className="ml-1 inline-block transition group-hover:translate-x-1">→</span>
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-stone-500">{a.desc}</p>
          </Link>
        ))}
      </div>

      <div className="grid max-w-4xl gap-6 md:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="card-header">
            <span className="accent-bar" />
            <h2 className="card-title">Current Academic Year</h2>
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
                className="input font-mono"
              />
              <p className="mt-2 text-xs text-stone-500">
                Format: YYYY-YY. All new applications are registered under this year.
              </p>
            </label>

            <Msg text={message} />

            <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="card-header">
            <span className="accent-bar" />
            <h2 className="card-title">Renewals — Next Financial Year</h2>
          </div>
          <div className="space-y-4 p-5">
            {renewalYear ? (
              <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3">
                <p className="text-sm font-bold text-emerald-800">
                  🟢 Renewals are OPEN for {renewalYear}
                </p>
                <p className="mt-1 text-xs text-emerald-700">
                  Students whose {currentYear} application is Approved can be renewed.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-stone-300 bg-stone-100/70 px-4 py-3">
                <p className="text-sm font-bold text-stone-600">🔒 Renewals are closed</p>
                <p className="mt-1 text-xs text-stone-500">
                  The Renew option is disabled everywhere until you open the next financial year.
                </p>
              </div>
            )}

            <Msg text={renewMessage} />

            {renewalYear ? (
              <button onClick={closeRenewals} disabled={renewBusy} className="btn-danger-outline w-full">
                {renewBusy ? "Working…" : `Close renewals for ${renewalYear}`}
              </button>
            ) : (
              <button onClick={openRenewals} disabled={renewBusy || !next} className="btn-success w-full">
                {renewBusy ? "Working…" : `Open renewals for ${next}`}
              </button>
            )}

            <p className="text-xs text-stone-500">
              Tip: set the {next} scholarship amounts in Scholarship Rates before opening renewals,
              so renewed applications pick the right amounts in reports.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
