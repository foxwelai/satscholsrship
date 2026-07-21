# SAT Scholarship Portal

Student scholarship management platform for **Shrimath Ananteshwar Temple, Manjeshwar (Kerala)** — for scholarships given to G.S.B. community students through the temple's 18 petes.

## Setup

```bash
npm install
```

Create `.env.local` with:

```
DATABASE_URL="postgresql://..."   # Neon Postgres connection string
SESSION_SECRET="..."              # random 32+ byte hex string
```

Push the schema and seed the 18 petes + a bootstrap super admin (only creates the admin account if it doesn't already exist — safe to re-run):

```bash
npm run db:push
npm run db:seed
```

The seed script prints the generated super admin password once — save it immediately.

## Run

```bash
npm run dev        # development — http://localhost:3000
npm run build && npm start   # production
```

Uploaded photos and passbook scans are stored in `public/uploads/` — back this up regularly (not covered by the database).

## Features

| Requirement | Where |
|---|---|
| Portal to fill all details | **New Application** — student profile + first year's application in one form |
| Student ID per pete (e.g. `MJS/26/0001`) | Generated automatically from the pete's short code + financial year + serial |
| Add / edit petes | **Petes** page (super admin only) — add, edit, deactivate |
| Search by Aadhar / ID / name | **Search Students** page, scoped to the logged-in user's pete |
| Yearly renewal | Open a student → **Add Next Year Application** → search finds them by Aadhar/ID, carries forward profile, records a new year's class/status |
| Approve & Close fast-track | On any application (new or renewal), **Approve & Close** sets status=Approved and closed=true in one action, for already-vetted returning students |
| Reports by pete / bank / class / category | **Reports** page, with status & financial-year filters, CSV export and print |
| Branch via IFSC code | Typing a valid IFSC auto-fills bank name & branch (Razorpay IFSC lookup) |
| Photo / bank passbook scan | Upload buttons — on a phone they open the camera directly |
| Printable form | **Print Blank Form** (English replica of the Kannada original) and per-student **Print Application**, selectable by financial year |
| Pete-scoped user access | **User Access** page (super admin only) — create a login per pete, reset password, reassign pete, revoke/reactivate |

## Data model

- **students** — permanent profile (identity, contact, family, bank, documents). Aadhar is required and unique — it's the durable key used to find a returning student in later years.
- **applications** — one row per financial year a student applies/renews for (class, category, marks, fee, status, closed flag). A student's scholarship history is the full list of their applications.
- **users** — `super_admin` (sees everything, manages petes and users) or `pete_admin` (scoped to one assigned pete — can only see/register/edit students and applications for that pete).

## Notes

- Duplicate Aadhar numbers are rejected at registration, with the existing student's ID shown and a pointer to use renewal instead.
- A student can only have one application per financial year (enforced at the database level).
- Student IDs never change after registration, even if the pete's short code is later edited.
- The IFSC lookup needs internet access; without it, bank details can be typed manually.
- Session cookies are signed JWTs (30-day expiry); passwords are hashed with bcrypt.
