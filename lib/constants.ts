export const CATEGORIES = [
  "P.U.C.",
  "Degree",
  "Engineering",
  "Medical",
  "Post Graduation",
] as const;

export const CLASSES: Record<string, string[]> = {
  "P.U.C.": ["P.U.C. - I Year", "P.U.C. - II Year"],
  Degree: ["Degree - 1st Year", "Degree - 2nd Year", "Degree - 3rd Year"],
  Engineering: [
    "Engineering - 1st Year",
    "Engineering - 2nd Year",
    "Engineering - 3rd Year",
    "Engineering - 4th Year",
  ],
  Medical: [
    "Medical - 1st Year",
    "Medical - 2nd Year",
    "Medical - 3rd Year",
    "Medical - 4th Year",
    "Medical - 5th Year",
  ],
  "Post Graduation": [
    "M.A. - 1st Year",
    "M.A. - 2nd Year",
    "M.Com. - 1st Year",
    "M.Com. - 2nd Year",
    "M.B.A. - 1st Year",
    "M.B.A. - 2nd Year",
    "Other P.G. - 1st Year",
    "Other P.G. - 2nd Year",
  ],
};

export const ALL_CLASSES = Object.values(CLASSES).flat();

// Application status per financial year. "Closed" marks a scholarship cycle
// as fully disbursed/finished for that student that year.
export const APPLICATION_STATUSES = ["Applied", "Approved", "Rejected", "Closed"] as const;

// Indian financial year runs April–March, e.g. "2026-27".
export function currentFinancialYear(date = new Date()): string {
  const y = date.getFullYear();
  const startYear = date.getMonth() >= 3 ? y : y - 1; // month 3 = April
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}

export function financialYearStart(fy: string): number {
  return parseInt(fy.split("-")[0], 10);
}

// Recent + upcoming financial years for dropdowns.
export function financialYearOptions(around = currentFinancialYear()): string[] {
  const start = financialYearStart(around);
  const years: string[] = [];
  for (let y = start - 2; y <= start + 1; y++) {
    years.push(`${y}-${String((y + 1) % 100).padStart(2, "0")}`);
  }
  return years;
}

export const TEMPLE = {
  name: "Shrimath Ananteshwar Temple, Manjeshwar (Kerala)",
  invocation: "|| Shri Bhadram Prasannaha ||",
  subtitle: "(For Gowda Saraswat Brahmin Community Students Only)",
  phone: "04998-272221",
  officePhone: "9188599221",
  email: "samjstemple@gmail.com",
};
