# Patient Documents & ID Verification

## 1. Document type catalog (frontend)
Reorder `DOCUMENT_TYPES` in `src/components/patient/DocumentUpload.tsx`. Default selection becomes `id_document`.

Order:
1. `id_document` — ID Document (default)
2. `passport` — Passport
3. `medical_aid_card` — Medical Aid Card
4. `prescription` — Prescription
5. `medical_report` — Medical Report
6. `blood_results` — Blood Results
7. `xray_scan` — X-Ray / Scan
8. `referral_letter` — Referral Letter
9. `vaccination_record` — Vaccination Record
10. `other` — Other

Existing rows with `document_type='other'` remain untouched (no migration of data).

## 2. Database changes (migration)
Add to `patient_documents`:
- `verification_status` text default `'not_uploaded'` — actual rows always `'pending'` on insert; enum-like values: `pending`, `verified`, `rejected`
- `verified_by uuid`, `verified_at timestamptz`, `rejection_reason text`
- `expiry_date date` (used for passports)

New helper RPC `public.get_patient_id_verification_status(_user uuid)` returning `not_uploaded | pending | verified | rejected` based on the most recent `id_document` or `passport` row.

New RPC `public.is_identity_verified(_user uuid)` returning boolean (true only if a verified ID/passport exists AND `profiles.phone_verified` AND `auth.users.email_confirmed_at`). Used by client and by withdrawal RPC.

RLS: admins can `UPDATE` `patient_documents` to change verification fields (new policy using `has_role(auth.uid(),'admin')`).

## 3. Patient UI
- `DocumentUpload.tsx`:
  - Reordered types, default `id_document`
  - Show a warning `Alert` banner above the upload card when no `id_document` or `passport` is verified/pending
  - For each document show a status badge (Pending / Verified / Rejected) with rejection reason tooltip
  - When type = `passport`, show an "Expiry date" date input; saved into `expiry_date`
- New small component `IdentityVerificationCard` shown on the Patient Dashboard top area (status: Verified / Pending / Required) with CTA to switch to Documents tab.
- Existing referral withdrawal action (in `ReferralCenter`) gated: if `is_identity_verified=false`, button disabled with toast "Please verify your identity before requesting a payout."

## 4. Profile badge
On `DoctorDetail` / patient-facing profile views where the patient name appears in the doctor's PatientDocuments side-panel: render a small "ID Verified" badge next to the patient name when verified.

## 5. Admin review
Extend existing admin documents area (new tab in `AdminDashboard` → `AdminPatientDocuments.tsx`): list pending ID/passport documents with Approve / Reject (reason) buttons. Approval sets `verification_status='verified'`, `verified_by=auth.uid()`, `verified_at=now()`. Rejection requires a reason and notifies the patient via `notifications`.

## 6. Backward compatibility
- All existing documents keep `verification_status` default of `pending` (backfill: set existing rows to `pending` except non-ID/passport types → `not_applicable`? Simpler: leave all existing as `pending`, but verification gating only checks for id_document/passport rows.)
- Default-selection change only affects new uploads; existing data unchanged.

## Technical notes
- Identity gating helper used both server-side (RPC) and client-side (display).
- Phone verification: `profiles.phone_verified boolean` already used elsewhere; if missing, add column default false.
- Email verification: read from `auth.users.email_confirmed_at` via SECURITY DEFINER RPC.
- No file-storage changes; `patient-documents` bucket and paths stay as-is.

Confirm to proceed and I'll ship the migration + UI changes.
