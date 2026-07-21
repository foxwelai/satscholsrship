import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "sat_session";
const secret = new TextEncoder().encode(process.env.SESSION_SECRET!);

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p)) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  let payload: { role?: string; peteId?: number | null } | null = null;
  if (token) {
    try {
      const result = await jwtVerify(token, secret);
      payload = result.payload as { role?: string; peteId?: number | null };
    } catch {
      payload = null;
    }
  }

  if (!payload) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const isAdminOnly = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  const isPetesManage = pathname === "/petes" || pathname.startsWith("/api/petes");
  const mutatingPetes = pathname.startsWith("/api/petes") && req.method !== "GET";

  if (isAdminOnly && payload.role !== "super_admin") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Super admin access required" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (mutatingPetes && payload.role !== "super_admin") {
    return NextResponse.json({ error: "Only super admin can manage petes" }, { status: 403 });
  }
  if (isPetesManage && pathname === "/petes" && payload.role !== "super_admin") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads/).*)"],
};
