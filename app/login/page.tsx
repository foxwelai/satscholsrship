"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      {/* backdrop flourishes */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 50% -5%, rgba(126,29,31,0.10), transparent), radial-gradient(ellipse 55% 40% at 8% 100%, rgba(212,175,55,0.14), transparent), radial-gradient(ellipse 55% 40% at 95% 95%, rgba(30,58,95,0.08), transparent)",
        }}
      />
      <div className="w-full max-w-105">
        <div className="card overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-maroon-800 via-gold-400 to-maroon-800" />
          <div className="px-8 pt-8 pb-9 sm:px-10">
            <div className="text-center">
              <Image
                src="/logo.png"
                alt="Srimath Anantheshwar Temple logo"
                width={112}
                height={112}
                priority
                unoptimized
                className="mx-auto h-28 w-28 rounded-full object-contain drop-shadow-[0_6px_16px_rgba(106,20,22,0.25)]"
              />
              <h1 className="mt-4 font-display text-[22px] leading-snug tracking-wide text-maroon-900">
                Srimath Anantheshwar Temple
              </h1>
              <p className="mt-0.5 text-[11px] font-semibold tracking-[0.28em] text-gold-600 uppercase">
                Scholarship Portal
              </p>
              <div className="mx-auto mt-4 flex items-center gap-3">
                <span className="h-px flex-1 bg-gradient-to-r from-transparent to-cream-300" />
                <span className="text-xs text-stone-400">Sign in to continue</span>
                <span className="h-px flex-1 bg-gradient-to-l from-transparent to-cream-300" />
              </div>
            </div>

            {error && <div className="alert-error mt-5">{error}</div>}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <label className="block">
                <span className="label">Username</span>
                <input
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input"
                  placeholder="your username"
                />
              </label>
              <label className="block">
                <span className="label">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  placeholder="••••••••"
                />
              </label>
              <button type="submit" disabled={busy} className="btn-primary w-full py-3 text-base">
                {busy ? "Signing in…" : "Sign In"}
              </button>
            </form>
          </div>
        </div>
        <p className="mt-5 text-center font-display text-sm tracking-wide text-maroon-800/60">
          ॥ विद्या ददाति विनयम् ॥
        </p>
        <p className="mt-1.5 text-center text-xs text-stone-400">
          Temple Office: 04998-272221 · 9188599221 · samjstemple@gmail.com
        </p>
      </div>
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
