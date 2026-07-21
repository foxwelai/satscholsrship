"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Login failed");
      return;
    }
    router.push(params.get("next") || "/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-amber-50/40 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border-2 border-red-800 bg-white p-8 shadow-lg"
      >
        <div className="mb-6 text-center">
          <div className="text-3xl">🛕</div>
          <h1 className="mt-1 text-lg font-bold text-red-900">
            Shrimath Ananteshwar Temple, Manjeshwar
          </h1>
          <p className="text-sm text-gray-600">Scholarship Portal Login</p>
        </div>
        {error && (
          <div className="mb-4 rounded border-2 border-red-500 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
            {error}
          </div>
        )}
        <label className="block text-sm">
          <span className="font-medium text-gray-700">Username</span>
          <input
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 focus:border-red-700 focus:outline-none"
          />
        </label>
        <label className="mt-4 block text-sm">
          <span className="font-medium text-gray-700">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 focus:border-red-700 focus:outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full rounded-lg bg-red-800 py-2.5 font-bold text-white shadow hover:bg-red-700 disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign In"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
