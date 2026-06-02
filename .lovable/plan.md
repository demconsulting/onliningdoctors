# Practice Patient Linking

Let doctors/receptionists create offline practice patient records and securely link them to a Doctors Onlining account once the patient registers and consents.

## Database

### `practice_patients`
- `id` uuid PK
- `practice_id` uuid (nullable — for solo doctors)
- `doctor_id` uuid (creating doctor; nullable if practice-owned)
- `created_by` uuid (auth.uid of staff who created)
- `full_name`, `phone`, `email` (nullable), `date_of_birth`, `gender`
- `id_number_hash` text (SHA-256 of normalized ID/passport) — indexed
- `id_type` text (`national_id` | `passport`)
- `country_code` text (for normalization scope)
- `address`, `emergency_contact_name`, `emergency_contact_phone`
- `allergies`, `chronic_conditions`, `medical_notes` (offline history fields)
- `linked_user_id` uuid (nullable) — set after consent
- `consent_status` text: `none` | `pending` | `granted` | `revoked` | `denied`
- `consent_requested_at`, `consent_decided_at`, `consent_ip`, `consent_user_agent`
- `created_at`, `updated_at`

Unique partial index: `(practice_id, id_number_hash)` where `id_number_hash` not null — prevents duplicates inside a practice.

### `practice_patient_link_requests`
Track each link offer shown to a registering patient (audit + idempotency).
- `id`, `practice_patient_id`, `user_id`, `status` (`pending`|`granted`|`denied`|`expired`)
- `created_at`, `decided_at`, `ip`, `user_agent`

### Helper
DB function `hash_identifier(_id_type text, _id_value text, _country text) returns text` — normalize (uppercase, strip whitespace/dashes) + SHA-256 with a server-side salt stored in DB setting. Used by triggers to populate `id_number_hash`. Frontend never sees raw IDs from other patients.

DB function `find_matching_practice_patients(_user_id uuid) returns setof practice_patients` (SECURITY DEFINER): matches the calling user's profile ID/passport hash against unlinked rows; returns only minimal fields (practice/doctor name, masked DOB).

DB function `link_practice_patient(_practice_patient_id uuid)` (SECURITY DEFINER): verifies the match again, sets `linked_user_id = auth.uid()`, `consent_status='granted'`, writes audit_log entry.

DB function `deny_practice_patient(_practice_patient_id uuid)`: marks `denied`, logs.

### RLS
- `practice_patients` SELECT: creating doctor, practice staff (existing `practice_members` pattern), admins, and the linked user (only after `consent_status='granted'`).
- INSERT/UPDATE: doctor (own) or active practice staff with roles `owner|practice_admin|doctor|receptionist|nurse`.
- DELETE: owner/practice_admin or creating doctor; not the linked patient.
- `practice_patient_link_requests` SELECT: the user, the practice staff, admins.

Profile additions on `profiles` (if not present): `id_number` (encrypted/raw stored only for own user), `id_type`, `country_code`. RLS already limits profile reads to self+admin.

## Frontend

### Doctor / Receptionist
New tab in Doctor Dashboard + Practice Calendar: **Practice Patients**.
- List view with search by name/phone/ID (server-side; staff can search raw ID since they have access).
- "Add Patient" dialog: full form, validates ID/passport, auto-hashes via trigger.
- Patient detail drawer: offline notes editor, list of online appointments once linked, link status badge.
- Component: `src/components/doctor/PracticePatients.tsx` + `PracticePatientForm.tsx` + `PracticePatientDetail.tsx`.

### Patient
On signup completion / first dashboard load:
- Query `find_matching_practice_patients` (uses the user's stored ID number).
- If matches exist, show modal **"We found an existing practice profile"**:
  - Shows doctor/practice name, partial DOB ("•• ••• 1985"), date created.
  - Buttons: **Link my account** (calls `link_practice_patient`) | **Not me** (calls `deny`).
- Once linked, banner in Appointments tab: "Linked to Dr. X's practice records."
- Component: `src/components/patient/PracticePatientLinkPrompt.tsx`, mounted from `Dashboard.tsx`.

Patient profile edit: capture `id_number` + `id_type` + `country_code` if missing (required to enable matching). Already partially exists — extend `ProfileEdit.tsx` to ensure required.

### Admin
New admin tab **Practice Patients**: view all, audit log of link decisions, ability to unlink (with reason → audit_log).

## Security & POPIA
- Raw ID numbers stored only on the patient's own `profiles` row (RLS self-only). Practice patients store only the salted hash + last 4.
- All link/deny/unlink actions write to `audit_logs` via SECURITY DEFINER functions.
- Linking never auto-merges medical records — it just associates the IDs; doctor's offline notes remain in `practice_patients.medical_notes`, online appointments stay in `appointments`. The doctor's view joins both.
- Other doctors cannot see another practice's patients (RLS scoped via `practice_id`/`doctor_id`).

## Non-goals (not modifying)
- Existing `appointments`, `payments`, `consultation_notes` tables untouched.
- Booking and payment flows unchanged.
- Medical Aid flows unchanged.

## Files
**New**
- `supabase/migrations/<ts>_practice_patient_linking.sql`
- `src/components/doctor/PracticePatients.tsx`
- `src/components/doctor/PracticePatientForm.tsx`
- `src/components/doctor/PracticePatientDetail.tsx`
- `src/components/patient/PracticePatientLinkPrompt.tsx`
- `src/components/admin/AdminPracticePatients.tsx`

**Edited**
- `src/pages/DoctorDashboard.tsx` — add tab
- `src/pages/Dashboard.tsx` — mount link prompt
- `src/components/patient/ProfileEdit.tsx` — capture ID/passport if missing
- `src/pages/AdminDashboard.tsx` + `AdminSidebar.tsx` — admin tab

Proceed?
