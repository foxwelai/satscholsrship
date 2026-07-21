"use client";

import { useCallback, useEffect, useState } from "react";
import { Pete } from "@/components/StudentForm";

type UserRow = {
  id: number;
  username: string;
  role: "super_admin" | "pete_admin";
  active: boolean;
  pete_id: number | null;
  pete_name: string | null;
  created_at: string;
};

const EMPTY = { username: "", role: "pete_admin" as "super_admin" | "pete_admin", pete_id: "" };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [petes, setPetes] = useState<Pete[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<{ username: string; password: string } | null>(null);

  const load = useCallback(() => {
    fetch("/api/admin/users").then((r) => r.json()).then(setUsers);
    fetch("/api/petes").then((r) => r.json()).then(setPetes);
  }, []);
  useEffect(load, [load]);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice(null);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to create user");
      return;
    }
    setNotice({ username: data.username, password: data.password });
    setForm(EMPTY);
    load();
  }

  async function resetPassword(u: UserRow) {
    if (!confirm(`Reset password for ${u.username}?`)) return;
    setError("");
    setNotice(null);
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset_password" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to reset password");
      return;
    }
    setNotice({ username: u.username, password: data.password });
  }

  async function toggleActive(u: UserRow) {
    if (!confirm(`${u.active ? "Revoke" : "Reactivate"} access for ${u.username}?`)) return;
    setError("");
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle_active" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to update access");
      return;
    }
    load();
  }

  async function reassignPete(u: UserRow, peteId: string) {
    await fetch(`/api/admin/users/${u.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pete_id: peteId || null }),
    });
    load();
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-red-900">User Access</h1>
      <p className="mb-4 text-sm text-gray-600">
        Create logins for pete representatives. Each pete admin can only view and manage students
        registered under their assigned pete.
      </p>

      {notice && (
        <div className="mb-4 rounded border-2 border-green-600 bg-green-50 px-4 py-3">
          <p className="font-semibold text-green-800">
            Credentials for <span className="font-mono">{notice.username}</span>:
          </p>
          <p className="mt-1 font-mono text-lg text-green-900">{notice.password}</p>
          <p className="mt-1 text-xs text-green-700">
            Share this password securely now — it will not be shown again.
          </p>
        </div>
      )}
      {error && (
        <div className="mb-4 rounded border-2 border-red-500 bg-red-50 px-4 py-2 font-semibold text-red-800">
          {error}
        </div>
      )}

      <form onSubmit={createUser} className="mb-6 rounded-lg border-2 border-red-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-bold text-red-900">Add New User</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <input
            required
            placeholder="Username *"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })}
            className="rounded border border-gray-300 px-3 py-2 focus:border-red-700 focus:outline-none"
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as "super_admin" | "pete_admin" })}
            className="rounded border border-gray-300 px-3 py-2 focus:border-red-700 focus:outline-none"
          >
            <option value="pete_admin">Pete Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>
          {form.role === "pete_admin" && (
            <select
              required
              value={form.pete_id}
              onChange={(e) => setForm({ ...form, pete_id: e.target.value })}
              className="rounded border border-gray-300 px-3 py-2 focus:border-red-700 focus:outline-none"
            >
              <option value="">— Assign Pete —</option>
              {petes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          <button className="rounded bg-red-800 px-4 py-2 font-semibold text-white hover:bg-red-700">
            + Create User (auto password)
          </button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <table className="w-full text-sm">
          <thead className="bg-red-900 text-left text-white">
            <tr>
              <th className="px-3 py-2.5">Username</th>
              <th className="px-3 py-2.5">Role</th>
              <th className="px-3 py-2.5">Pete</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className={`border-b last:border-0 ${u.active ? "" : "bg-gray-50 text-gray-400"}`}>
                <td className="px-3 py-2 font-semibold">{u.username}</td>
                <td className="px-3 py-2">{u.role === "super_admin" ? "Super Admin" : "Pete Admin"}</td>
                <td className="px-3 py-2">
                  {u.role === "pete_admin" ? (
                    <select
                      value={u.pete_id ?? ""}
                      onChange={(e) => reassignPete(u, e.target.value)}
                      className="rounded border border-gray-300 px-2 py-1 text-sm"
                    >
                      <option value="">— none —</option>
                      {petes.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2">{u.active ? "Active" : "Revoked"}</td>
                <td className="px-3 py-2">
                  <button onClick={() => resetPassword(u)} className="mr-3 font-semibold text-blue-800 hover:underline">
                    Reset Password
                  </button>
                  <button onClick={() => toggleActive(u)} className="text-red-700 hover:underline">
                    {u.active ? "Revoke" : "Reactivate"}
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
