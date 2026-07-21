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
      <h1 className="mb-1 text-xl font-bold text-red-900">Manage Petes</h1>
      <p className="mb-4 text-sm text-gray-600">
        The short code is used to generate Student IDs — e.g. Manjeshwar (MJS) →{" "}
        <span className="font-mono">MJS/26/0001</span>. Changing a short code only affects new
        registrations.
      </p>

      <form onSubmit={save} className="mb-6 rounded-lg border-2 border-red-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-bold text-red-900">{editingId ? "Edit Pete" : "Add New Pete"}</h2>
        {error && <p className="mb-2 font-semibold text-red-700">{error}</p>}
        <div className="grid gap-3 md:grid-cols-5">
          <input
            required
            placeholder="Pete name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded border border-gray-300 px-3 py-2 focus:border-red-700 focus:outline-none"
          />
          <input
            required
            placeholder="Short code (e.g. MJS) *"
            value={form.short_code}
            maxLength={5}
            onChange={(e) => setForm({ ...form, short_code: e.target.value.toUpperCase() })}
            className="rounded border border-gray-300 px-3 py-2 font-mono focus:border-red-700 focus:outline-none"
          />
          <input
            placeholder="Member name"
            value={form.member_name}
            onChange={(e) => setForm({ ...form, member_name: e.target.value })}
            className="rounded border border-gray-300 px-3 py-2 focus:border-red-700 focus:outline-none"
          />
          <input
            placeholder="Member mobile"
            value={form.member_mobile}
            onChange={(e) => setForm({ ...form, member_mobile: e.target.value })}
            className="rounded border border-gray-300 px-3 py-2 focus:border-red-700 focus:outline-none"
          />
          <div className="flex gap-2">
            <button className="flex-1 rounded bg-red-800 px-4 py-2 font-semibold text-white hover:bg-red-700">
              {editingId ? "Save" : "+ Add"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(EMPTY);
                  setError("");
                }}
                className="rounded border border-gray-400 px-3 py-2 text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </form>

      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <table className="w-full text-sm">
          <thead className="bg-red-900 text-left text-white">
            <tr>
              <th className="px-3 py-2.5">Pete</th>
              <th className="px-3 py-2.5">Short Code</th>
              <th className="px-3 py-2.5">Member</th>
              <th className="px-3 py-2.5">Mobile</th>
              <th className="px-3 py-2.5">Students</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {petes.map((p) => (
              <tr key={p.id} className={`border-b last:border-0 ${p.active ? "" : "bg-gray-50 text-gray-400"}`}>
                <td className="px-3 py-2 font-semibold">{p.name}</td>
                <td className="px-3 py-2 font-mono">{p.short_code}</td>
                <td className="px-3 py-2">{p.member_name}</td>
                <td className="px-3 py-2">{p.member_mobile}</td>
                <td className="px-3 py-2">{p.student_count}</td>
                <td className="px-3 py-2">{p.active ? "Active" : "Inactive"}</td>
                <td className="px-3 py-2">
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
                    className="mr-3 font-semibold text-blue-800 hover:underline"
                  >
                    Edit
                  </button>
                  <button onClick={() => toggleActive(p)} className="text-gray-600 hover:underline">
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
