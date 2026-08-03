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

// Next year's class within the same category — e.g. "Degree - 1st Year" →
// "Degree - 2nd Year". Stays on the final year if already there.
export function nextClass(category: string, currentClass: string): string {
  const list = CLASSES[category] ?? [];
  const i = list.indexOf(currentClass);
  if (i === -1) return currentClass;
  return list[Math.min(i + 1, list.length - 1)];
}

export const DEGREE_COURSES = [
  "B.A.",
  "B.Com.",
  "B.Sc.",
  "B.B.A.",
  "B.C.A.",
  "B.S.W.",
  "Other",
] as const;

export const ENGINEERING_COURSES = [
  "B.Tech. (Computer Science)",
  "B.Tech. (Electronics & Communication)",
  "B.Tech. (Mechanical)",
  "B.Tech. (Civil)",
  "B.Tech. (Electrical)",
  "B.E. (Computer Science)",
  "B.E. (Electronics)",
  "B.E. (Mechanical)",
  "B.E. (Civil)",
  "B.Arch.",
  "B.Pharm.",
  "Diploma (Engineering)",
  "Other",
] as const;

export const MEDICAL_COURSES = [
  "M.B.B.S.",
  "B.D.S.",
  "B.A.M.S.",
  "B.H.M.S.",
  "B.Sc. Nursing",
  "B.Pharm.",
  "Other",
] as const;

export const PG_COURSES = [
  "M.A.",
  "M.Com.",
  "M.Sc.",
  "M.Tech.",
  "M.B.A.",
  "M.C.A.",
  "M.S.W.",
  "Ph.D.",
  "Other",
] as const;

export const COURSE_OPTIONS_BY_CATEGORY: Record<string, readonly string[]> = {
  Degree: DEGREE_COURSES,
  Engineering: ENGINEERING_COURSES,
  Medical: MEDICAL_COURSES,
  "Post Graduation": PG_COURSES,
};

// Occupation options
export const OCCUPATION_OPTIONS = [
  "Business",
  "Service (Government)",
  "Service (Private)",
  "Agriculture",
  "Labor",
  "Homemaker",
  "Retired",
  "Deceased",
  "Other",
] as const;

// Application status per financial year. "Closed" marks a scholarship cycle
// as fully disbursed/finished for that student that year.
export const APPLICATION_STATUSES = ["Pending Approval", "Approved", "Rejected", "Closed"] as const;

// Indian financial year runs April–March, e.g. "2026-27".
export function currentFinancialYear(date = new Date()): string {
  const y = date.getFullYear();
  const startYear = date.getMonth() >= 3 ? y : y - 1; // month 3 = April
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}

export function financialYearStart(fy: string): number {
  return parseInt(fy.split("-")[0], 10);
}

// "2026-27" → "2027-28"
export function nextFinancialYear(fy: string): string {
  const start = financialYearStart(fy) + 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
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
