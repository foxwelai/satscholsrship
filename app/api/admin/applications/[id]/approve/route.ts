import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { applications } from "@/lib/schema";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ error: "Only super admin can approve" }, { status: 403 });
  }

  const { id } = await params;
  const appId = Number(id);
  if (!appId) {
    return NextResponse.json({ error: "Invalid application ID" }, { status: 400 });
  }

  try {
    const result = await db
      .update(applications)
      .set({
        status: "Approved",
        rejectionReason: "",
        approvedAt: new Date(),
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
    return NextResponse.json({ error: "Failed to approve application" }, { status: 500 });
  }
}
