import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, isUniqueViolation } from "@/lib/db";
import { petes } from "@/lib/schema";
import { getSession } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (session?.role !== "super_admin") {
    return NextResponse.json({ error: "Only super admin can manage petes" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();
  const { name, short_code, member_name = "", member_mobile = "", active = true } = body;
  if (!name?.trim() || !short_code?.trim()) {
    return NextResponse.json({ error: "Name and short code are required" }, { status: 400 });
  }
  try {
    await db
      .update(petes)
      .set({
        name: name.trim(),
        shortCode: short_code.trim().toUpperCase(),
        memberName: member_name.trim(),
        memberMobile: member_mobile.trim(),
        active: !!active,
      })
      .where(eq(petes.id, Number(id)));
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = isUniqueViolation(e)
      ? "A pete with this name or short code already exists"
      : "Failed to update pete";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
