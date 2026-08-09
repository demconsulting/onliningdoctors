# Founding Doctor Programme — Full Build

Extends the existing Founding Doctors module and Recruitment CRM in place. No rebuild, no branding/layout changes. Delivered in 4 phases so each part is testable before the next.

## Phase 1 — Programme core (schema + module rename + tiers)

Database:
- Extend `founding_doctor_program` with: pioneer limit (20), founding limit (80), programme enabled, auto-close pioneer, auto-close founding, waiting list enabled, marketing copy fields (headline, description, pioneer copy, founding copy).
- New `founding_programme_pricing`: pioneer setup fee (750), founding setup fee (750), standard setup fee (7997), monthly care plan (250), VAT enabled + VAT rate.
- New `founding_exit_policy`: commitment months (36), standard practice value (7997), founding contribution (750).
- Add `founding_tier` (`pioneer` / `founding` / `standard`) and `founding_sequence` to `doctors`, set by a trigger on approval — sequence 1–20 = Pioneer, 21–100 = Founding, 101+ = Standard. No manual assignment.
- Backfill existing founding doctors by approval date.
- All tables: GRANTs + RLS (admin manage, doctors read their own tier).

UI (`AdminFoundingDoctors.tsx`):
- Title → "Founding Doctor Programme", subtitle "Recruit, Onboard and Manage the First 100 Founding Doctors".
- Slot counter → three progress cards (Pioneer 20, Founding 80, Overall 100) with filled/remaining/progress, auto-updating.
- Tabs → Applications, Pioneer Founding Doctors, Founding Doctors, Standard Doctors, Settings.
- KPI card row: applications received, pending approval, pioneer, founding, standard, total active, MRR (active doctors x monthly care plan), conversion rate (approved / applications).

## Phase 2 — Settings, pricing, exit policy

- Settings tab sections: programme limits, enable/disable, auto-close toggles, waiting list, editable marketing copy.
- Pricing configuration form (5 fees + VAT toggle) written to `founding_programme_pricing`; a shared `useFoundingPricing` hook so onboarding and agreements read the same values.
- Early Exit Policy panel: commitment period, standard value, contribution, plus a live calculator showing the remaining subsidised setup investment and an example table at 6 / 12 / 24 / 36 months.

## Phase 3 — Digital Practice Services + recruitment source

- New `doctor_digital_services`: doctor, service type (website, google_business_profile, social_media, website_migration, website_upgrade, integration_only), status (not_required, pending, in_progress, awaiting_approval, live, completed), notes, timestamps. RLS: admin manage, doctor reads own.
- Onboarding/admin panel to select required services per doctor and track each status individually. Only selected services are displayed and tracked; services stay optional.
- `recruitment_source` field on the doctor record with the 11 fixed options, editable in both the Founding Programme doctor view and the CRM prospect dialog, shared via `linked_doctor_profile_id` so there is no duplicate entry.

## Phase 4 — Recruitment CRM enhancements + reporting

- Pipeline stages expanded to the 10 requested stages (Lead → Contacted → Meeting Scheduled → Presentation Completed → Proposal Sent → Application Submitted → Documents Verified → Approved → Onboarding → Completed), reusing the existing Kanban board and drag-and-drop.
- Prospect record gains: assigned business developer, priority, lead score, date added, next follow-up (existing), plus attachments via the existing document upload system.
- Communication history: extend `recruitment_communications` channels to phone, WhatsApp, email, meeting, internal note.
- New `recruitment_commissions`: amount, status (pending/approved/paid), payment date, reference. Admin managed.
- Activity timeline auto-recorded by triggers on stage change, approval, digital service completion, activation and commission payment.
- Business Developer dashboard: per-BD totals (leads, contacted, meetings, applications, approved, pioneer/founding/standard recruited, conversion rate, commission earned/pending/paid, monthly performance) plus a cross-BD comparison table.
- Reports tab with the 9 requested reports, exported to Excel / PDF / CSV via the existing `exportData.ts` helper.

## Technical notes

- Existing tables reused: `founding_doctor_program`, `founding_doctor_applications`, `doctors`, `recruitment_prospects`, `recruitment_communications`, `recruitment_tasks`, `platform_fee_settings`.
- Classification and slot counting move into `get_founding_slots()` (rewritten to return per-tier counts) so UI and public pages stay consistent.
- Existing verification, onboarding, document upload and founding pricing-plan logic are left intact.
- Every new public table gets GRANTs, RLS and an `updated_at` trigger.
