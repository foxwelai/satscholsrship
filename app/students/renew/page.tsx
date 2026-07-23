"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CATEGORIES, CLASSES, currentFinancialYear, financialYearOptions } from "@/lib/constants";

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

export default function RenewStudentPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [students, setStudents] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Student | null>(null);
  const [year, setYear] = useState(currentFinancialYear());
  const [category, setCategory] = useState("");
  const [currentClass, setCurrentClass] = useState("");
  const [yearOptions, setYearOptions] = useState<string[]>(financialYearOptions());
  const [error, setError] = useState("");

  // Fetch available years from rates table
  useEffect(() => {
    fetch("/api/rates")
      .then((r) => r.json())
      .then((data: { years?: string[] }) => {
        setYearOptions((prev) =>
          Array.from(new Set([...prev, ...(data.years ?? [])])).sort((a, b) => (a < b ? 1 : -1))
        );
      })
      .catch(() => {});
  }, []);

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

  async function proceedToApplication() {
    setError("");
    if (!selected || !year || !category || !currentClass) {
      setError("Please select student, year, category, and class");
      return;
    }

    // Redirect to create a new application for this student
    router.push(
      `/students/${selected.id}/applications/new?year=${encodeURIComponent(year)}&category=${encodeURIComponent(category)}&class=${encodeURIComponent(currentClass)}`
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
                      setSelected(s);
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
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 ring-1 ring-emerald-200">
                <span>✓ Selected:</span>
                <span className="font-semibold text-stone-800">{selected.name}</span>
                <button
                  onClick={() => setSelected(null)}
                  className="ml-auto text-xs font-bold text-maroon-700 hover:underline"
                >
                  Change
                </button>
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
              <select value={year} onChange={(e) => setYear(e.target.value)} className="input">
                {yearOptions.map((fy) => (
                  <option key={fy}>{fy}</option>
                ))}
              </select>
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
            </label>

            <button
              onClick={proceedToApplication}
              disabled={!selected || !year || !category || !currentClass}
              className="btn-primary w-full"
            >
              Continue to Application →
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 text-center">
        <Link href="/students" className="text-sm font-semibold text-maroon-700 hover:underline">
          ← Back to Search Students
        </Link>
      </div>
    </div>
  );
}
