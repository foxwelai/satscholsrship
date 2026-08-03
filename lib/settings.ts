import { eq } from "drizzle-orm";
import { db } from "./db";
import { settings } from "./schema";
import { currentFinancialYear, nextFinancialYear } from "./constants";

export async function getSetting(key: string): Promise<string> {
  const [row] = await db.select().from(settings).where(eq(settings.key, key));
  return row?.value ?? "";
}

// The portal only ever works with two years at once:
//  - current: the academic year applications are entered for
//  - renewal: the NEXT year, but only once the super admin opens it in
//    Settings (empty ⇒ renewals are disabled everywhere)
export async function getAcademicYears(): Promise<{
  current: string;
  renewal: string | null;
  next: string;
}> {
  const current = (await getSetting("current_academic_year")) || currentFinancialYear();
  const renewal = (await getSetting("renewal_year")) || null;
  return { current, renewal, next: nextFinancialYear(current) };
}
