import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { getSession, hashPassword, generateTempPassword } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (session?.role !== "super_admin") {
    return NextResponse.json({ error: "Super admin access required" }, { status: 403 });
  }
  const { id } = await params;
  const userId = Number(id);
  const body = await req.json();

  const [existing] = await db.select().from(users).where(eq(users.id, userId));
  if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (body.action === "reset_password") {
    const password = generateTempPassword();
    await db.update(users).set({ passwordHash: await hashPassword(password) }).where(eq(users.id, userId));
    return NextResponse.json({ ok: true, password });
  }

  if (body.action === "toggle_active") {
    if (existing.role === "super_admin" && existing.active) {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(and(eq(users.role, "super_admin"), eq(users.active, true)));
      if (count <= 1) {
        return NextResponse.json(
          { error: "Cannot revoke the last active super admin account" },
          { status: 400 }
        );
      }
    }
    await db.update(users).set({ active: !existing.active }).where(eq(users.id, userId));
    return NextResponse.json({ ok: true, active: !existing.active });
  }

  if (body.pete_id !== undefined) {
    await db.update(users).set({ peteId: body.pete_id ? Number(body.pete_id) : null }).where(eq(users.id, userId));
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "No recognized action" }, { status: 400 });
}
