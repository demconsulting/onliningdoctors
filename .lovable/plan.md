# Doctor Recruitment CRM — Phase 2 Enhancement Plan

Extends the existing CRM at `src/components/admin/recruitment/` without touching registration, verification, payments, patient or appointment logic.

## 1. Database (single migration)

New tables (all admin-only RLS via `has_role('admin')`, with `service_role` grants):

- `recruitment_activation_events` — `prospect_id`, `doctor_profile_id`, `event_type` (verified | awaiting_cohort | activated | first_consultation | active), `occurred_at`, `metadata jsonb`, `created_by`.
- `recruitment_early_access_interest` — `doctor_profile_id` (nullable), `prospect_id` (nullable), `email`, `feature_key` (practice_management | financial_management | medical_aid_automation | tax_reports | bank_reconciliation | enterprise_tools), `notes`, `created_at`.
- `recruitment_source_catalog` (seed-only lookup) — `key`, `label`, `is_active`, `sort_order`. Seed: referral, linkedin, whatsapp, medical_centre, facebook, website, event, other.

Extensions to existing `recruitment_prospects`:
- Widen `stage` check constraint to include `awaiting_cohort_activation`, `activated`, `first_consultation_completed`, `active_doctor`.
- Add optional cached columns: `activated_at`, `first_consultation_at`, `last_activity_at` (nullable timestamps).

Helper views (security_invoker on, admin RLS via underlying tables):
- `v_recruitment_funnel` — counts per funnel stage + 30-day prior counts for trend.
- `v_recruitment_by_geo` — counts grouped by province/city/specialty/verification/founding.
- `v_recruitment_by_source` — counts + conversion % (registered/total) per source.
- `v_doctor_success` — joins `doctors` + `profiles` + appointments aggregates (registration/verification/activation/first consult/last activity/totals/status) — restricted to admin via RLS on base tables; expose via SECURITY DEFINER RPC `admin_doctor_success_list()`.
- RPC `admin_first_consultation_pending()` — doctors with no `appointments.status='completed'` yet, with profile completion %.
- RPC `admin_doctor_health_score(doctor_profile_id uuid)` — returns 0–100 plus structured recommendations.

## 2. Frontend additions (in `src/components/admin/recruitment/`)

New components:
- `FunnelAnalytics.tsx` — 12-stage funnel cards (count, conversion %, trend arrow).
- `ActivationPipeline.tsx` — timeline of activation events per doctor.
- `FoundingCohortDashboard.tsx` — uses existing `useFoundingSlots`; progress bar, pending/approved/rejected, "Cohort Complete" state at 10/10.
- `DoctorSuccessTable.tsx` — sortable table from `admin_doctor_success_list()`.
- `FirstConsultationTracker.tsx` — list + "Send Follow-Up" (reuses `send-recruitment-email`).
- `GeographicDashboard.tsx` — summary cards + table view + simple SVG SA province heat (no external map dep).
- `SourceTrackingDashboard.tsx` — table + bar chart (recharts) of conversion by source.
- `EarlyAccessInterestList.tsx` — admin view of interested doctors per feature.
- `DoctorHealthScoreCard.tsx` — reusable badge + recommendations panel.
- `ExportMenu.tsx` — CSV (native), Excel (`xlsx`), PDF (`jspdf` + `jspdf-autotable`, already in deps if present — otherwise add).

Update `AdminRecruitmentCRM.tsx`:
- Add tabs: **Funnel**, **Activation**, **Founding Cohort**, **Success**, **First Consult**, **Geography**, **Sources**, **Early Access**.
- Keep existing tabs (Pipeline, Prospects, Tasks, Referrals, Reporting) intact.

Update `ProspectDialog.tsx`:
- Add `referral_source` dropdown bound to `recruitment_source_catalog`.
- Add "Express early-access interest" multi-select writing to `recruitment_early_access_interest`.

## 3. Reports / Exports

`src/components/admin/recruitment/exports/` with one generator per report:
- recruitment-pipeline, founding-progress, activation, success, source-performance.
Each supports CSV / XLSX / PDF via shared util `exportData.ts`.

## 4. Out of scope (do not touch)

Doctor registration, verification, onboarding, patient workflows, payments, medical aid logic, appointments, existing CRM Pipeline/Prospects/Tasks/Referrals UI.

## 5. Order of execution

1. Migration (tables + stage widening + views + RPCs + seeds) — requires approval.
2. After approval: build components + tabs + exports + prospect dialog updates.
3. Verify admin route renders, no regressions to existing tabs.

Approve to proceed with the migration.
