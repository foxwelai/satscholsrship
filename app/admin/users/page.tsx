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
      <h1 className="page-title">User Access</h1>
      <p className="page-subtitle mb-6">
        Create logins for pete representatives. Each pete admin can only view and manage students
        registered under their assigned pete.
      </p>

      {notice && (
        <div className="mb-4 rounded-xl border border-emerald-300 bg-emerald-50 px-5 py-4">
          <p className="text-sm font-semibold text-emerald-800">
            🔑 Credentials for <span className="font-mono">{notice.username}</span>
          </p>
          <p className="mt-1.5 inline-block rounded-lg bg-white px-3 py-1.5 font-mono text-lg font-bold tracking-wide text-emerald-900 ring-1 ring-emerald-200">
            {notice.password}
          </p>
          <p className="mt-1.5 text-xs text-emerald-700">
            Share this password securely now — it will not be shown again.
          </p>
        </div>
      )}
      {error && <div className="alert-error mb-4">{error}</div>}

      <form onSubmit={createUser} className="card mb-6 overflow-hidden">
        <div className="card-header">
          <span className="accent-bar" />
          <h2 className="card-title">Add New User</h2>
        </div>
        <div className="grid gap-3 p-5 md:grid-cols-4">
          <input
            required
            placeholder="Username *"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })}
            className="input"
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as "super_admin" | "pete_admin" })}
            className="input"
          >
            <option value="pete_admin">Pete Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>
          {form.role === "pete_admin" && (
            <select
              required
              value={form.pete_id}
              onChange={(e) => setForm({ ...form, pete_id: e.target.value })}
              className="input"
            >
              <option value="">— Assign Pete —</option>
              {petes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          <button className="btn-primary">+ Create User (auto password)</button>
        </div>
      </form>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Role</th>
              <th>Pete</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className={u.active ? "" : "bg-stone-50 text-stone-400"}>
                <td className="font-semibold">
                  <span className="mr-2 inline-grid h-6 w-6 place-items-center rounded-full bg-maroon-50 text-[11px] font-bold text-maroon-800 uppercase ring-1 ring-maroon-100">
                    {u.username.charAt(0)}
                  </span>
                  {u.username}
                </td>
                <td>
                  <span className={u.role === "super_admin" ? "badge-navy" : "badge-amber"}>
                    {u.role === "super_admin" ? "Super Admin" : "Pete Admin"}
                  </span>
                </td>
                <td>
                  {u.role === "pete_admin" ? (
                    <select
                      value={u.pete_id ?? ""}
                      onChange={(e) => reassignPete(u, e.target.value)}
                      className="input w-auto px-2.5 py-1.5 text-xs"
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
                <td>
                  <span className={u.active ? "badge-green" : "badge-red"}>
                    {u.active ? "Active" : "Revoked"}
                  </span>
                </td>
                <td>
                  <button
                    onClick={() => resetPassword(u)}
                    className="mr-3 cursor-pointer text-xs font-bold text-navy-700 hover:underline"
                  >
                    Reset Password
                  </button>
                  <button
                    onClick={() => toggleActive(u)}
                    className="cursor-pointer text-xs font-bold text-red-700 hover:underline"
                  >
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
