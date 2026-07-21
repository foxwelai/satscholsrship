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
      className="rounded px-3 py-1.5 text-sm font-medium text-red-100 hover:bg-red-800 hover:text-white"
    >
      Logout
    </button>
  );
}
