"use client";

import ScholarshipForm from "@/components/ScholarshipForm";

export default function BlankFormPage() {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-xl font-bold text-red-900">Blank Application Form (English)</h1>
          <p className="text-sm text-gray-600">
            Exact English replica of the official Kannada form — print and distribute to petes.
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="rounded bg-red-800 px-5 py-2 font-semibold text-white shadow hover:bg-red-700"
        >
          🖨️ Print Form
        </button>
      </div>
      <ScholarshipForm />
    </div>
  );
}
