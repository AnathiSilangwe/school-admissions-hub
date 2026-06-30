
# Thabazi Secondary School — Admissions Portal (Core Flow)

A polished applicant-facing admissions app on TanStack Start + Lovable Cloud. Admin dashboard, applicant portal, and bonus features deferred.

## Pages

- `/` — Home: logo, hero, About, Admission Requirements, "Apply Now"
- `/apply` — Multi-step application form with progress bar
- `/success` — Confirmation (application number, appointment, fee)

## Apply flow (single route, stepper UI)

1. **Applicant Info** — name, SA ID, DOB (auto Age), gender, email, cell, address
2. **Parent / Guardian** — name, relationship, phone, email
3. **Academic Info** — previous school, current grade, applying grade, average %
   - Gate: if average < 40 → disqualification message, Next disabled
4. **Grade Selection + seat check** — Grades 8–12 dropdown with live availability; full grades blocked
5. **Documents** — drag-and-drop upload for SA ID, Previous Report, Proof of Residence, Birth Certificate (optional). PDF/JPG/PNG, ≤10 MB
6. **Review & Submit** — summary + appointment preview (today + 7 days, 09:00, venue, R100)

On submit → server function final seat check, generates `TSS-2026-NNNNNN`, increments `grades.occupied`, inserts applicant + documents + appointment, returns payload → redirects to `/success`.

## Design

- Primary `#2563eb`, white surfaces on light gray `#f8fafc`
- Glassmorphism cards (white/70 + backdrop-blur + soft shadow, rounded-2xl)
- Figtree (body) + Outfit (display) via `@fontsource`
- Animated buttons, step transitions, progress bar
- Mobile responsive nav and forms
- Semantic tokens in `src/styles.css`; no hardcoded colors

## Database (Lovable Cloud / Postgres)

All tables with explicit GRANTs + RLS:

- `grades` — id, name, capacity, occupied. Seeded per spec. SELECT to `anon`.
- `applicants` — full fields, `applying_grade_id` FK, unique `application_number`, status default `pending`. INSERT to `anon`; no SELECT.
- `documents` — applicant_id FK + four storage paths. INSERT to `anon`.
- `appointments` — applicant_id FK, date, time, fee_paid. INSERT to `anon`.

Storage bucket `admissions-documents` (private). Uploads client-side under a per-submission UUID path. Admin download deferred.

## Server logic

`submitApplication` server function (public):
1. Zod validate (mirrors client; rejects avg < 40)
2. Guarded seat claim: `UPDATE grades SET occupied = occupied + 1 WHERE id=$1 AND occupied < capacity RETURNING *`. No row → "grade full".
3. Application number from Postgres sequence: `TSS-{year}-{seq6}`
4. Insert applicant, documents (paths only), appointment (today+7, 09:00)
5. Return `{ applicationNumber, appointmentDate, appointmentTime, venue, fee }`

Document uploads happen before submit (direct to storage). Submit records paths only.

## Admin auth scaffolding (no UI yet)

- Enable Lovable Cloud email+password auth
- Create `app_role` enum, `user_roles` table, `has_role()` security-definer function so future admin policies plug in cleanly

## Out of scope (next iterations)

Admin dashboard / approve-reject / capacity editor, applicant status portal, email/SMS, QR, analytics, export, audit logs.

## Technical details

- TanStack Start + React 19 + Tailwind v4 + Lovable Cloud
- `react-hook-form` + `zod`; multi-step state in one form context
- Custom dropzone uploads via `supabase.storage.from('admissions-documents').upload()`
- SA ID 13-digit check; DOB→Age live; `date-fns` for appointment math
- Routes: `src/routes/index.tsx`, `apply.tsx`, `success.tsx` — each with own `head()` metadata
- Server fns in `src/lib/admissions.functions.ts`: `submitApplication`, `getGradeAvailability` (no auth middleware — public)
- Migration creates tables, GRANTs, RLS, sequence `application_number_seq`, seeds grades, storage bucket + policies, roles scaffold
- Grade availability fetched via TanStack Query (`ensureQueryData` in `/apply` loader)
