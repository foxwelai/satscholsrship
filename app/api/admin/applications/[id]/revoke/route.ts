import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { applications } from "@/lib/schema";
import { getSession } from "@/lib/auth";

// Undo a rejection: the application goes back into the pending queue with its
// reason cleared, so it can be reviewed again from scratch. Approving a
// rejected application outright goes through the approve route instead.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ error: "Only super admin can revoke a rejection" }, { status: 403 });
  }

  const { id } = await params;
  const appId = Number(id);
  if (!appId) {
    return NextResponse.json({ error: "Invalid application ID" }, { status: 400 });
  }

  try {
    const [existing] = await db
      .select({ status: applications.status })
      .from(applications)
      .where(eq(applications.id, appId));

    if (!existing) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }
    if (existing.status !== "Rejected") {
      return NextResponse.json(
        { error: `Only a rejected application can be revoked (this one is ${existing.status})` },
        { status: 400 }
      );
    }

    const result = await db
      .update(applications)
      .set({
        status: "Pending Approval",
        rejectionReason: "",
        approvedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(applications.id, appId))
      .returning();

    return NextResponse.json({ success: true, application: result[0] });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to revoke rejection" }, { status: 500 });
  }
}
