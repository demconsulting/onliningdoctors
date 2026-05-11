# Founding 10 Doctors Program

A complete founding-doctor system layered on top of the existing pricing/fee architecture (`platform_fee_settings` + `doctors.fee_settings_id`) so founding pricing is *protected* and never affected by future global pricing changes.

## 1. Database (one migration)

**New table: `founding_doctor_program`** (singleton config row)
- `max_slots` int default 10
- `program_label` text default 'Founding Doctor 2026'
- `applications_open` bool default true
- `default_fee_settings_id` uuid → `platform_fee_settings.id` (the founding plan template)

**New table: `founding_doctor_applications`**
- `doctor_id` uuid (profile_id), `status` text ('pending'|'approved'|'rejected'|'inactive'|'waitlist')
- `motivation` text, `years_experience` int, `specialty` text, `availability` text
- `reviewed_by`, `reviewed_at`, `rejection_reason`
- `created_at`, `updated_at`

**Extend `doctors` table** with founding fields:
- `is_founding_doctor` bool default false
- `founding_status` text ('none'|'pending'|'approved'|'rejected'|'inactive')
- `founding_doctor_since` timestamptz
- `founding_expiry` timestamptz (nullable = lifetime)
- `founding_pricing_plan_id` uuid → `platform_fee_settings.id` (per-doctor protected override)
- `founding_locked` bool default true (protects from bulk pricing updates)

**New `platform_fee_settings` flag**: `is_founding_plan` bool default false — marks plans as founding-only so they never appear in regular doctor plan pickers.

**Seed**: one default founding plan (e.g. `platform_fee_percent = 5` vs default 15) marked `is_founding_plan = true`, plus singleton row in `founding_doctor_program`.

**Trigger**: when `founding_doctor_applications.status` → 'approved':
- Check approved count < `max_slots` (raise if full)
- Set `doctors.is_founding_doctor = true`, `founding_status = 'approved'`, `founding_doctor_since = now()`, `founding_pricing_plan_id = program.default_fee_settings_id`, `fee_settings_id = founding_pricing_plan_id`
- Send notification to doctor
- When status → 'rejected' or 'inactive': revert `is_founding_doctor`, restore default `fee_settings_id`

**RLS**:
- `founding_doctor_program`: public SELECT (counter), admin ALL
- `founding_doctor_applications`: doctor can INSERT/SELECT own; admin ALL
- Doctor UPDATE policy on `doctors` already blocks changing protected fields via `prevent_doctor_suspension_self_update` — extend to also block `is_founding_doctor`, `founding_status`, `founding_pricing_plan_id`, `founding_locked`

**RPC**: `get_founding_slots()` returns `{ approved_count, remaining, max_slots, applications_open }` (public).

**Pricing resolver**: extend `resolveFeeSettings()` in `src/lib/feeCalculator.ts` — if doctor has `founding_pricing_plan_id` and `founding_locked = true`, use it (overrides everything).

## 2. Admin: "Founding Doctors" section

New file: `src/components/admin/AdminFoundingDoctors.tsx` with three tabs:
1. **Applications Queue** — list pending applications, approve/reject inline (with reason), shows motivation/experience
2. **Active Founding Doctors** — table of approved doctors, change pricing plan dropdown (only `is_founding_plan` plans), deactivate, view billing
3. **Program Settings** — edit `max_slots`, toggle `applications_open`, pick default founding plan, live counter "X / 10 slots used"

Wire into `AdminSidebar` (new item "Founding Doctors", `Crown` icon) and `AdminDashboard` lazy loader.

## 3. Doctor dashboard

**`FoundingBenefitsCard.tsx`** — shown in `DoctorOverview` when `is_founding_doctor = true`:
- Gold/teal gradient card with "Founding Doctor 2026" badge
- Lists: reduced platform fee (% shown), premium features included, early-adopter status, locked-in pricing, partnership status
- "Member since {founding_doctor_since}" line

**Apply CTA** for non-founders (in `DoctorOverview` or a new banner) — opens `FoundingApplicationDialog.tsx`:
- Form: motivation, years experience, specialty (prefilled), availability
- Submits to `founding_doctor_applications`
- Shows live remaining-slots counter; disabled when closed/full (with "Join waitlist" fallback)
- After submit: shows pending state

**Pricing card** in `DoctorBilling` — when founding, replace standard plan card with premium "Founding Doctor Early-Adopter Plan" card showing locked-in fee, savings vs standard, expiry (or "Lifetime").

## 4. Public-facing slot counter

Tiny hook `useFoundingSlots()` calling the RPC; reuse on doctor signup page (`DoctorSignup.tsx` / `DoctorBenefits.tsx`) to display "3 Founding Positions Remaining" or "Applications Closed".

## 5. Onboarding flow

Add an opt-in checkbox + collapsible founding fields on `DoctorSignup.tsx` ("Apply for the Founding 10 Doctors Program"). On signup completion, if checked, create a `founding_doctor_applications` row.

## 6. Files to create / edit

**Created**
- `supabase/migrations/<ts>_founding_doctors.sql`
- `src/components/admin/AdminFoundingDoctors.tsx`
- `src/components/doctor/FoundingBenefitsCard.tsx`
- `src/components/doctor/FoundingApplicationDialog.tsx`
- `src/hooks/useFoundingSlots.ts`

**Edited**
- `src/components/admin/AdminSidebar.tsx`, `src/pages/AdminDashboard.tsx` (register section)
- `src/components/doctor/DoctorOverview.tsx` (mount cards)
- `src/components/doctor/DoctorBilling.tsx` (founding pricing card)
- `src/lib/feeCalculator.ts` (founding override in resolver)
- `src/pages/DoctorSignup.tsx` (founding opt-in)
- `src/pages/DoctorBenefits.tsx` (slot counter + apply CTA)

## Technical notes

- Founding pricing protection = doctor row carries its own `founding_pricing_plan_id`; resolver prefers it; trigger refuses to overwrite when `founding_locked = true`.
- 10-slot enforcement is in the approval trigger (atomic) — UI counter is informational only.
- Future tiers (Early Access, Premium Partner) reuse the same pattern: add `founding_status` enum values + new `is_*_plan` boolean on `platform_fee_settings`.
- All new tables have RLS enabled; admin uses `has_role(auth.uid(),'admin')`.

Approve to proceed and I'll run the migration first, then ship the code.
