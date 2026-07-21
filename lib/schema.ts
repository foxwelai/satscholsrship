import { pgTable, serial, text, integer, boolean, timestamp, varchar, unique } from "drizzle-orm/pg-core";

export const petes = pgTable("petes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  shortCode: varchar("short_code", { length: 10 }).notNull().unique(),
  memberName: text("member_name").notNull().default(""),
  memberMobile: text("member_mobile").notNull().default(""),
  active: boolean("active").notNull().default(true),
});

// role: 'super_admin' | 'pete_admin'
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(),
  peteId: integer("pete_id").references(() => petes.id),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Permanent student profile — created once. Aadhar is the durable identifier
// used to find a returning student across scholarship years.
export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  studentId: text("student_id").notNull().unique(),
  peteId: integer("pete_id").notNull().references(() => petes.id),
  regYear: integer("reg_year").notNull(),
  name: text("name").notNull(),
  mobile: text("mobile").notNull().default(""),
  dob: text("dob").notNull().default(""),
  aadhar: varchar("aadhar", { length: 12 }).notNull().unique(),
  schoolName: text("school_name").notNull().default(""),
  schoolAddress: text("school_address").notNull().default(""),
  schoolPhone: text("school_phone").notNull().default(""),
  fatherName: text("father_name").notNull().default(""),
  address: text("address").notNull().default(""),
  motherName: text("mother_name").notNull().default(""),
  motherOccupation: text("mother_occupation").notNull().default(""),
  familyIncome: text("family_income").notNull().default(""),
  contactPhone: text("contact_phone").notNull().default(""),
  bankAccount: text("bank_account").notNull().default(""),
  bankName: text("bank_name").notNull().default(""),
  bankBranch: text("bank_branch").notNull().default(""),
  ifsc: text("ifsc").notNull().default(""),
  photoPath: text("photo_path").notNull().default(""),
  passbookPath: text("passbook_path").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// One row per financial year a student applies/renews for.
// status: 'Applied' | 'Approved' | 'Rejected' | 'Closed'
// `closed` is a separate fast-track flag: staff can approve and close a
// renewal in one action once a student is already vetted from prior years.
export const applications = pgTable(
  "applications",
  {
    id: serial("id").primaryKey(),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    financialYear: text("financial_year").notNull(),
    category: text("category").notNull().default(""),
    currentClass: text("current_class").notNull().default(""),
    prevYearMarks: text("prev_year_marks").notNull().default(""),
    annualFee: text("annual_fee").notNull().default(""),
    status: text("status").notNull().default("Applied"),
    closed: boolean("closed").notNull().default(false),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdBy: integer("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("applications_student_year_unique").on(t.studentId, t.financialYear)]
);
