import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, isUniqueViolation } from "@/lib/db";
import { users, petes } from "@/lib/schema";
import { getSession, hashPassword, generateTempPassword } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (session?.role !== "super_admin") {
    return NextResponse.json({ error: "Super admin access required" }, { status: 403 });
  }
  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      role: users.role,
      active: users.active,
      created_at: users.createdAt,
      pete_id: users.peteId,
      pete_name: petes.name,
    })
    .from(users)
    .leftJoin(petes, eq(petes.id, users.peteId))
    .orderBy(users.username);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (session?.role !== "super_admin") {
    return NextResponse.json({ error: "Super admin access required" }, { status: 403 });
  }
  const body = await req.json();
  const username = body.username?.trim().toLowerCase();
  const role = body.role === "super_admin" ? "super_admin" : "pete_admin";
  const peteId = role === "pete_admin" ? Number(body.pete_id) : null;

  if (!username) return NextResponse.json({ error: "Username is required" }, { status: 400 });
  if (role === "pete_admin" && !peteId) {
    return NextResponse.json({ error: "A pete must be assigned to a pete admin user" }, { status: 400 });
  }

  const password = body.password?.trim() || generateTempPassword();
  const passwordHash = await hashPassword(password);

  try {
    const [row] = await db
      .insert(users)
      .values({ username, passwordHash, role, peteId })
      .returning({ id: users.id });
    return NextResponse.json({ id: row.id, username, password }, { status: 201 });
  } catch (e: unknown) {
    const msg = isUniqueViolation(e) ? "Username already exists" : "Failed to create user";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
