"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  return (
    <button
      onClick={handleLogout}
      className="cursor-pointer rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-cream-100 transition hover:border-gold-300/50 hover:bg-white/20 hover:text-white"
    >
      Logout ↦
    </button>
  );
}
