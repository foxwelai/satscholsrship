"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CATEGORIES,
  CLASSES,
  COURSE_OPTIONS_BY_CATEGORY,
  nextClass,
} from "@/lib/constants";

type Student = {
  id: number;
  student_id: string;
  name: string;
  aadhar: string;
};

type SearchResult = Student & {
  latest_class?: string;
  latest_year?: string;
};

type LatestApp = {
  financialYear: string;
  category: string;
  currentClass: string;
  courseName: string;
};

function RenewStudentInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentIdParam = searchParams.get("student_id");

  const [searchQuery, setSearchQuery] = useState("");
  const [students, setStudents] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Student | null>(null);
  const [currentYear, setCurrentYear] = useState("");
  const [renewalYear, setRenewalYear] = useState<string | null>(null); // null = still loading, "" = closed
  const [category, setCategory] = useState("");
  const [currentClass, setCurrentClass] = useState("");
  const [course, setCourse] = useState("");
  const [prefillNote, setPrefillNote] = useState("");
  const [eligible, setEligible] = useState<boolean | null>(null); // null = nothing selected yet
  const [eligibilityNote, setEligibilityNote] = useState("");
  const [error, setError] = useState("");
  const [scholarshipAmount, setScholarshipAmount] = useState<number | null>(null);

  const year = renewalYear || "";

  // On selecting a student, pull their latest application and suggest the
  // natural continuation: same category & course, class advanced one year
  // (e.g. B.Com Degree - 1st Year → Degree - 2nd Year, still B.Com).
  function selectStudent(s: Student) {
    setSelected(s);
    setPrefillNote("");
    setEligible(null);
    setEligibilityNote("");
    fetch(`/api/students/${s.id}`)
      .then((r) => r.json())
      .then((data: { applications?: (LatestApp & { status: string })[] }) => {
        const apps = data.applications ?? [];
        const curApp = apps.find((a) => a.financialYear === currentYear);
        const alreadyRenewed = renewalYear ? apps.some((a) => a.financialYear === renewalYear) : false;

        // Renewal is only possible once the current year's application is Approved.
        if (alreadyRenewed) {
          setEligible(false);
          setEligibilityNote(`This student already has a ${renewalYear} application.`);
        } else if (!curApp) {
          setEligible(false);
          setEligibilityNote(`This student has no ${currentYear} application — renewal is only for students continuing from the current year.`);
        } else if (!["Approved", "Closed"].includes(curApp.status)) {
          setEligible(false);
          setEligibilityNote(`Their ${currentYear} application is "${curApp.status}" — it must be Approved by the super admin before renewing.`);
        } else {
          setEligible(true);
          const advanced = nextClass(curApp.category, curApp.currentClass);
          setCategory(curApp.category);
          setCurrentClass(advanced);
          setCourse(curApp.courseName ?? "");
          setPrefillNote(
            `${currentYear}: ${curApp.currentClass}${curApp.courseName ? ` (${curApp.courseName})` : ""} — suggested next: ${advanced}`
          );
        }
      })
      .catch(() => {});
  }

  // Renewals are gated by Settings: only the configured renewal year is
  // allowed, and the page is disabled entirely until the super admin opens it.
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data: { current_academic_year?: string; renewal_year?: string }) => {
        setCurrentYear(data.current_academic_year ?? "");
        setRenewalYear(data.renewal_year ?? "");
      })
      .catch(() => setRenewalYear(""));
  }, []);

  // Pre-fetch and select student if student_id param provided (DB id — fetch
  // the record directly rather than text-searching, which could mismatch).
  useEffect(() => {
    if (studentIdParam && currentYear && renewalYear !== null) {
      fetch(`/api/students/${studentIdParam}`)
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((data: Student) => {
          if (data?.id) selectStudent(data);
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentIdParam, currentYear, renewalYear]);

  // Search for students
  useEffect(() => {
    if (!searchQuery.trim()) {
      setStudents([]);
      return;
    }
    setLoading(true);
    const params = new URLSearchParams({ q: searchQuery.trim() });
    fetch(`/api/students?${params}`)
      .then((r) => r.json())
      .then((data: SearchResult[]) => {
        setStudents(data);
        setLoading(false);
      });
  }, [searchQuery]);

  // Fetch scholarship amount when year and category are selected
  useEffect(() => {
    if (!year || !category) {
      setScholarshipAmount(null);
      return;
    }
    fetch(`/api/rates?financial_year=${encodeURIComponent(year)}`)
      .then((r) => r.json())
      .then((data) => {
        const rate = data.rates?.find((r: any) => r.category === category);
        if (rate) {
          setScholarshipAmount(rate.amount);
        } else {
          setScholarshipAmount(null);
        }
      })
      .catch(() => {
        setScholarshipAmount(null);
      });
  }, [year, category]);

  const courseOptions = category ? COURSE_OPTIONS_BY_CATEGORY[category] ?? [] : [];
  const needsCourse = courseOptions.length > 0;

  async function proceedToApplication() {
    setError("");
    if (!eligible) {
      setError(eligibilityNote || "This student is not eligible for renewal yet.");
      return;
    }
    if (!selected || !year || !category || !currentClass) {
      setError("Please select student, year, category, and class");
      return;
    }
    if (needsCourse && !course) {
      setError("Please select the course for this category.");
      return;
    }

    // Redirect to create a new application for this student
    router.push(
      `/students/${selected.id}/applications/new?year=${encodeURIComponent(year)}&category=${encodeURIComponent(category)}&class=${encodeURIComponent(currentClass)}&course=${encodeURIComponent(needsCourse ? course : "")}`
    );
  }

  const classOptions = category ? CLASSES[category] ?? [] : [];

  return (
    <div>
      <h1 className="page-title">Renew Student Application</h1>
      <p className="page-subtitle mb-6">
        Search for a student and renew their scholarship application for a new financial year.
      </p>

      {error && <div className="alert-error mb-4">{error}</div>}

      {renewalYear === "" && (
        <div className="card mx-auto max-w-xl p-10 text-center">
          <p className="text-4xl">🔒</p>
          <p className="mt-4 font-display text-lg text-maroon-900">Renewals are not open yet</p>
          <p className="mt-2 text-sm text-stone-500">
            The super admin must open the next financial year from{" "}
            <span className="font-semibold">Settings</span> before students can be renewed.
          </p>
        </div>
      )}

      {renewalYear ? (
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Step 1: Search & Select Student */}
        <div className="card overflow-hidden">
          <div className="card-header">
            <span className="accent-bar" />
            <h2 className="card-title">1. Search Student</h2>
          </div>
          <div className="space-y-4 p-5">
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-stone-400">
                🔍
              </span>
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Aadhar, Student ID, or Name…"
                className="input pl-11"
              />
            </div>

            {loading ? (
              <p className="text-sm text-stone-400">Searching…</p>
            ) : students.length === 0 ? (
              <p className="text-sm text-stone-400">
                {searchQuery ? "No students found" : "Start typing to search"}
              </p>
            ) : (
              <div className="space-y-2">
                {students.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      selectStudent(s);
                      setSearchQuery("");
                      setStudents([]);
                    }}
                    className={`w-full rounded-lg border-2 p-3 text-left transition ${
                      selected?.id === s.id
                        ? "border-maroon-600 bg-maroon-50"
                        : "border-cream-200 bg-white hover:border-maroon-300"
                    }`}
                  >
                    <p className="font-mono text-sm font-bold text-maroon-700">{s.student_id}</p>
                    <p className="font-medium text-stone-800">{s.name}</p>
                    <p className="text-xs text-stone-400">{s.aadhar}</p>
                  </button>
                ))}
              </div>
            )}

            {selected && (
              <div
                className={`rounded-lg p-3 ring-1 ${
                  eligible === false
                    ? "bg-red-50 ring-red-200"
                    : "bg-emerald-50 ring-emerald-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{eligible === false ? "✗" : "✓"} Selected:</span>
                  <span className="font-semibold text-stone-800">{selected.name}</span>
                  <button
                    onClick={() => {
                      setSelected(null);
                      setEligible(null);
                      setEligibilityNote("");
                    }}
                    className="ml-auto text-xs font-bold text-maroon-700 hover:underline"
                  >
                    Change
                  </button>
                </div>
                {eligible === false && (
                  <p className="mt-1.5 text-xs font-semibold text-red-700">{eligibilityNote}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Select Year, Category, Class */}
        <div className="card overflow-hidden">
          <div className="card-header">
            <span className="accent-bar" />
            <h2 className="card-title">2. Application Details</h2>
          </div>
          <div className="space-y-4 p-5">
            <label className="block">
              <span className="label">
                Financial Year <span className="text-maroon-700">*</span>
              </span>
              <input disabled value={year} className="input font-mono" />
              <p className="mt-1 text-xs text-stone-500">
                Renewal year — opened by the super admin in Settings.
              </p>
            </label>

            <label className="block">
              <span className="label">
                Category <span className="text-maroon-700">*</span>
              </span>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setCurrentClass("");
                  setCourse("");
                }}
                className="input"
              >
                <option value="">— Select Category —</option>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="label">
                Class / Course <span className="text-maroon-700">*</span>
              </span>
              <select value={currentClass} onChange={(e) => setCurrentClass(e.target.value)} className="input">
                <option value="">— Select Class —</option>
                {classOptions.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              {prefillNote && (
                <p className="mt-1.5 text-xs font-semibold text-emerald-700">↻ {prefillNote}</p>
              )}
            </label>

            {needsCourse && (
              <label className="block">
                <span className="label">
                  Course Name <span className="text-maroon-700">*</span>
                </span>
                <select value={course} onChange={(e) => setCourse(e.target.value)} className="input">
                  <option value="">— Select Course —</option>
                  {courseOptions.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
            )}

            {scholarshipAmount !== null && (
              <div className="rounded-lg bg-emerald-50 p-3 ring-1 ring-emerald-200">
                <p className="text-xs text-stone-500">Scholarship Amount</p>
                <p className="mt-1 text-lg font-bold text-emerald-700">₹{scholarshipAmount.toLocaleString("en-IN")}</p>
              </div>
            )}

            <button
              onClick={proceedToApplication}
              disabled={!selected || !eligible || !year || !category || !currentClass || (needsCourse && !course)}
              className="btn-primary w-full"
            >
              Continue to Application →
            </button>
          </div>
        </div>
      </div>

      ) : null}

      <div className="mt-6 text-center">
        <Link href="/students" className="text-sm font-semibold text-maroon-700 hover:underline">
          ← Back to Search Students
        </Link>
      </div>
    </div>
  );
}

export default function RenewStudentPage() {
  return (
    <Suspense>
      <RenewStudentInner />
    </Suspense>
  );
}
