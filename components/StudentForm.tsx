"use client";

import { useEffect, useRef, useState } from "react";
import PhotoUpload from "./PhotoUpload";

export type Pete = {
  id: number;
  name: string;
  short_code: string;
  member_name: string;
  member_mobile: string;
  active: number | boolean;
};

export type Session = {
  userId: number;
  username: string;
  role: "super_admin" | "pete_admin";
  peteId: number | null;
  peteName: string | null;
};

export type StudentFormValues = Record<string, string>;

const EMPTY: StudentFormValues = {
  pete_id: "",
  name: "",
  mobile: "",
  dob: "",
  aadhar: "",
  school_name: "",
  father_name: "",
  address: "",
  mother_name: "",
  mother_occupation: "",
  family_income: "",
  contact_phone: "",
  bank_account: "",
  bank_name: "",
  bank_branch: "",
  ifsc: "",
  photo_path: "",
  passbook_path: "",
};

function Input({
  label,
  value,
  onChange,
  required,
  type = "text",
  placeholder,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="label">
        {label} {required && <span className="text-maroon-700">*</span>}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className="input"
      />
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card overflow-hidden">
      <div className="card-header">
        <span className="accent-bar" />
        <h2 className="card-title">{title}</h2>
      </div>
      <div className="grid gap-4 p-5 md:grid-cols-2">{children}</div>
    </section>
  );
}

function FileUpload({
  label,
  kind,
  path,
  onUploaded,
}: {
  label: string;
  kind: "photo" | "passbook";
  path: string;
  onUploaded: (path: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", kind);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Upload failed");
      return;
    }
    onUploaded(data.path);
  }

  const isPdf = path.endsWith(".pdf");
  return (
    <div className="text-sm">
      <span className="label">{label}</span>
      <div className="mt-1 flex items-start gap-3.5">
        <div className="flex h-28 w-24 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-cream-300 bg-cream-50 text-xs text-stone-400">
          {path ? (
            isPdf ? (
              <a href={path} target="_blank" className="p-2 text-center font-semibold text-maroon-700 underline">
                View PDF
              </a>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={path} alt={label} className="h-full w-full object-cover" />
            )
          ) : (
            "No file"
          )}
        </div>
        <div className="space-y-1.5">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="btn-navy px-3.5 py-2 text-xs"
          >
            {busy ? "Uploading…" : path ? "Replace" : "📷 Scan / Upload"}
          </button>
          {path && (
            <button
              type="button"
              onClick={() => onUploaded("")}
              className="block cursor-pointer text-xs font-semibold text-red-600 hover:underline"
            >
              Remove
            </button>
          )}
          {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
          <p className="text-xs text-stone-400">JPG / PNG / PDF, max 10 MB. On mobile, opens the camera.</p>
        </div>
      </div>
    </div>
  );
}

export default function StudentForm({
  initial,
  submitLabel,
  onSubmit,
  session,
  children,
}: {
  initial?: Record<string, unknown>;
  submitLabel: string;
  onSubmit: (values: StudentFormValues) => Promise<string | null>; // returns error or null
  session?: Session | null;
  children?: React.ReactNode;
}) {
  const [values, setValues] = useState<StudentFormValues>(() => {
    const merged: StudentFormValues = { ...EMPTY };
    for (const [k, v] of Object.entries(initial ?? {})) {
      if (k in EMPTY && v !== undefined && v !== null) merged[k] = String(v);
    }
    return merged;
  });
  const [petes, setPetes] = useState<Pete[]>([]);
  const [ifscStatus, setIfscStatus] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/petes")
      .then((r) => r.json())
      .then(setPetes);
  }, []);

  useEffect(() => {
    if (session?.role === "pete_admin" && session.peteId && !values.pete_id) {
      setValues((prev) => ({ ...prev, pete_id: String(session.peteId) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const set = (field: string) => (v: string) => setValues((prev) => ({ ...prev, [field]: v }));

  async function lookupIfsc(code: string) {
    setIfscStatus("Looking up branch…");
    const res = await fetch(`/api/ifsc/${code}`);
    const data = await res.json();
    if (res.ok) {
      setValues((prev) => ({ ...prev, bank_name: data.bank, bank_branch: data.branch }));
      setIfscStatus(`✓ ${data.bank}, ${data.branch} (${data.city})`);
    } else {
      setIfscStatus(`✗ ${data.error}`);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const err = await onSubmit(values);
    setSaving(false);
    if (err) {
      setError(err);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  const isPeteLocked = session?.role === "pete_admin";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div className="alert-error">{error}</div>}

      <Section title="A) Student Details">
        <label className="block">
          <span className="label">
            Pete (18 Petes under the Temple) <span className="text-maroon-700">*</span>
          </span>
          {isPeteLocked ? (
            <input disabled value={session?.peteName ?? ""} className="input" />
          ) : (
            <select
              required
              value={values.pete_id}
              onChange={(e) => set("pete_id")(e.target.value)}
              className="input"
            >
              <option value="">— Select Pete —</option>
              {petes
                .filter((p) => p.active)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.short_code})
                  </option>
                ))}
            </select>
          )}
        </label>
        <Input label="Student's Name" value={values.name} onChange={set("name")} required />
        <Input label="Mobile No." value={values.mobile} onChange={set("mobile")} maxLength={10} />
        <Input label="Date of Birth (D.O.B.)" type="date" value={values.dob} onChange={set("dob")} />
        <Input
          label="Aadhar Number"
          value={values.aadhar}
          onChange={(v) => set("aadhar")(v.replace(/\D/g, ""))}
          maxLength={12}
          required
          placeholder="12-digit Aadhar"
        />
        <Input label="School / College Name" value={values.school_name} onChange={set("school_name")} />
        <PhotoUpload
          label="Student Photo"
          photoType="profile"
          studentId={values.aadhar || ""}
          currentUrl={values.photo_path}
          onUploadComplete={set("photo_path")}
        />
      </Section>

      <Section title="B) Family Details">
        <Input label="Father's Name" value={values.father_name} onChange={set("father_name")} />
        <Input
          label="Residential Address / Location"
          value={values.address}
          onChange={set("address")}
          required
          placeholder="e.g. Bolandugutturoad, Hosabettu, Manjeshwar"
        />
        <Input label="Mother's Name" value={values.mother_name} onChange={set("mother_name")} />
        <Input label="Mother's Occupation" value={values.mother_occupation} onChange={set("mother_occupation")} />
        <Input label="Family Annual Income (₹)" value={values.family_income} onChange={set("family_income")} />
        <Input label="Contact Phone / Mobile No." value={values.contact_phone} onChange={set("contact_phone")} />
      </Section>

      <Section title="C) Student's Bank Details">
        <Input label="Bank Account Number" value={values.bank_account} onChange={set("bank_account")} />
        <div>
          <Input
            label="Bank IFSC Code (auto-fills bank & branch)"
            value={values.ifsc}
            onChange={(v) => {
              const code = v.toUpperCase();
              set("ifsc")(code);
              setIfscStatus("");
              if (/^[A-Z]{4}0[A-Z0-9]{6}$/.test(code)) lookupIfsc(code);
            }}
            maxLength={11}
            placeholder="e.g. SBIN0001234"
          />
          {ifscStatus && (
            <p
              className={`mt-1.5 text-xs font-semibold ${ifscStatus.startsWith("✓") ? "text-emerald-700" : "text-gold-600"}`}
            >
              {ifscStatus}
            </p>
          )}
        </div>
        <Input label="Bank Name (Only Nationalized Bank)" value={values.bank_name} onChange={set("bank_name")} />
        <Input label="Branch" value={values.bank_branch} onChange={set("bank_branch")} />
        <PhotoUpload
          label="Bank Pass Book (photo / scan)"
          photoType="passbook"
          studentId={values.aadhar || ""}
          currentUrl={values.passbook_path}
          onUploadComplete={set("passbook_path")}
        />
      </Section>

      {children}

      <button
        type="submit"
        disabled={saving}
        className="btn-primary w-full py-3.5 text-base md:w-auto md:px-12"
      >
        {saving ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
