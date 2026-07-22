"use client";

import { useCallback, useEffect, useState } from "react";
import { Pete } from "@/components/StudentForm";

type PeteRow = Pete & { student_count: number };

const EMPTY = { name: "", short_code: "", member_name: "", member_mobile: "" };

export default function PetesPage() {
  const [petes, setPetes] = useState<PeteRow[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    fetch("/api/petes").then((r) => r.json()).then(setPetes);
  }, []);
  useEffect(load, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const url = editingId ? `/api/petes/${editingId}` : "/api/petes";
    const editing = petes.find((p) => p.id === editingId);
    const res = await fetch(url, {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, active: editing?.active ?? 1 }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to save");
      return;
    }
    setForm(EMPTY);
    setEditingId(null);
    load();
  }

  async function toggleActive(p: PeteRow) {
    await fetch(`/api/petes/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...p, active: p.active ? 0 : 1 }),
    });
    load();
  }

  return (
    <div>
      <h1 className="page-title">Manage Petes</h1>
      <p className="page-subtitle mb-6">
        The short code is used to generate Student IDs — e.g. Manjeshwar (MJS) →{" "}
        <span className="font-mono font-semibold text-maroon-800">MJS/26/0001</span>. Changing a
        short code only affects new registrations.
      </p>

      <form onSubmit={save} className="card mb-6 overflow-hidden">
        <div className="card-header">
          <span className="accent-bar" />
          <h2 className="card-title">{editingId ? "Edit Pete" : "Add New Pete"}</h2>
        </div>
        <div className="p-5">
          {error && <div className="alert-error mb-4">{error}</div>}
          <div className="grid gap-3 md:grid-cols-5">
            <input
              required
              placeholder="Pete name *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input"
            />
            <input
              required
              placeholder="Short code (e.g. MJS) *"
              value={form.short_code}
              maxLength={5}
              onChange={(e) => setForm({ ...form, short_code: e.target.value.toUpperCase() })}
              className="input font-mono"
            />
            <input
              placeholder="Member name"
              value={form.member_name}
              onChange={(e) => setForm({ ...form, member_name: e.target.value })}
              className="input"
            />
            <input
              placeholder="Member mobile"
              value={form.member_mobile}
              onChange={(e) => setForm({ ...form, member_mobile: e.target.value })}
              className="input"
            />
            <div className="flex gap-2">
              <button className="btn-primary flex-1">{editingId ? "Save" : "+ Add"}</button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setForm(EMPTY);
                    setError("");
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      </form>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Pete</th>
              <th>Short Code</th>
              <th>Member</th>
              <th>Mobile</th>
              <th>Students</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {petes.map((p) => (
              <tr key={p.id} className={p.active ? "" : "bg-stone-50 text-stone-400"}>
                <td className="font-semibold">{p.name}</td>
                <td>
                  <span className="rounded-md bg-maroon-50 px-2 py-0.5 font-mono text-xs font-bold text-maroon-800 ring-1 ring-maroon-100">
                    {p.short_code}
                  </span>
                </td>
                <td>{p.member_name}</td>
                <td>{p.member_mobile}</td>
                <td className="font-semibold">{p.student_count}</td>
                <td>
                  <span className={p.active ? "badge-green" : "badge-gray"}>
                    {p.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>
                  <button
                    onClick={() => {
                      setEditingId(p.id);
                      setForm({
                        name: p.name,
                        short_code: p.short_code,
                        member_name: p.member_name,
                        member_mobile: p.member_mobile,
                      });
                      setError("");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="mr-3 cursor-pointer text-xs font-bold text-navy-700 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => toggleActive(p)}
                    className="cursor-pointer text-xs font-semibold text-stone-500 hover:underline"
                  >
                    {p.active ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
