import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, petes } from "@/lib/schema";
import { verifyPassword, createSessionToken, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  if (!username?.trim() || !password) {
    return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
  }
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username.trim().toLowerCase()));

  if (!user || !user.active) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }

  let peteName: string | null = null;
  if (user.peteId) {
    const [pete] = await db.select().from(petes).where(eq(petes.id, user.peteId));
    peteName = pete?.name ?? null;
  }

  const token = await createSessionToken({
    userId: user.id,
    username: user.username,
    role: user.role as "super_admin" | "pete_admin",
    peteId: user.peteId,
  });
  await setSessionCookie(token);

  return NextResponse.json({
    username: user.username,
    role: user.role,
    peteId: user.peteId,
    peteName,
  });
}
