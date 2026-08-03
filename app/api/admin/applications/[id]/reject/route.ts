import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { applications } from "@/lib/schema";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ error: "Only super admin can reject" }, { status: 403 });
  }

  const { id } = await params;
  const appId = Number(id);
  if (!appId) {
    return NextResponse.json({ error: "Invalid application ID" }, { status: 400 });
  }

  const body = await req.json();
  const reason = (body.reason || "").trim();
  if (!reason) {
    return NextResponse.json({ error: "Rejection reason is required" }, { status: 400 });
  }

  try {
    const result = await db
      .update(applications)
      .set({
        status: "Rejected",
        rejectionReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(applications.id, appId))
      .returning();

    if (!result.length) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, application: result[0] });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to reject application" }, { status: 500 });
  }
}
