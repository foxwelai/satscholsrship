import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, sql } from "drizzle-orm";
import * as schema from "./schema";

const client = postgres(process.env.DATABASE_URL!, { max: 5 });
export const db = drizzle(client, { schema });

const { petes, students } = schema;

export async function generateStudentId(peteId: number, regYear: number): Promise<string> {
  const [pete] = await db.select().from(petes).where(eq(petes.id, peteId));
  if (!pete) throw new Error("Pete not found");
  const yy = String(regYear % 100).padStart(2, "0");
  const prefix = `${pete.shortCode}/${yy}/`;
  const rows = await db
    .select({ studentId: students.studentId })
    .from(students)
    .where(sql`${students.studentId} LIKE ${prefix + "%"}`);
  let maxSeq = 0;
  for (const r of rows) {
    const seq = parseInt(r.studentId.slice(prefix.length), 10);
    if (!Number.isNaN(seq) && seq > maxSeq) maxSeq = seq;
  }
  return `${prefix}${String(maxSeq + 1).padStart(4, "0")}`;
}

// Drizzle wraps the underlying postgres error in a DrizzleQueryError whose own
// .message is "Failed query: ...", with the real Postgres error under .cause.
export function isUniqueViolation(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  if (/duplicate key/i.test(e.message)) return true;
  const cause = (e as { cause?: unknown }).cause;
  return cause instanceof Error && /duplicate key/i.test(cause.message);
}
