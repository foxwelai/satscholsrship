import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { petes } from "@/lib/schema";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let peteName: string | null = null;
  if (session.peteId) {
    const [pete] = await db.select().from(petes).where(eq(petes.id, session.peteId));
    peteName = pete?.name ?? null;
  }

  return NextResponse.json({ ...session, peteName });
}
