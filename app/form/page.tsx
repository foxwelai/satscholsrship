"use client";

import ScholarshipForm from "@/components/ScholarshipForm";

export default function BlankFormPage() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between print:hidden">
        <div>
          <h1 className="page-title">Blank Application Form (English)</h1>
          <p className="page-subtitle">
            Exact English replica of the official Kannada form — print and distribute to petes.
          </p>
        </div>
        <button onClick={() => window.print()} className="btn-primary px-6">
          🖨️ Print Form
        </button>
      </div>
      <ScholarshipForm />
    </div>
  );
}
