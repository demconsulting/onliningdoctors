# Patient Payment UI Restructure

Reshape the patient booking experience so internal financial details disappear from patient view and medical aid bookings require explicit doctor verification before a slot can be picked.

## 1. Patient-facing simplification (BookAppointment)

- Remove every fee breakdown from the patient flow: no platform fee, no processing fee, no VAT line, no "Doctor receives" line, no "You pay vs gross" math.
- The patient sees a single line: **"Consultation Fee: R___"** (using the doctor's currency).
- Card payment flow remains instant: pick payment method → pick slot → pay → done.
- Replace the misleading copy `"Doctor hasn't enabled medical aid pricing — private rate applies."` with: **"Medical aid consultations require verification before booking."**
- All fee calculator usage in `BookAppointment.tsx` is removed (kept only inside Doctor Wallet, Earnings, and Admin Financial dashboards).

## 2. Medical Aid verification flow (new)

When the patient picks **Medical Aid**, the booking flow branches:

```text
[Pick doctor] → [Pick payment method = Medical Aid]
   → [Submit medical aid form]
        - Provider (dropdown of doctor's supported aids)
        - Plan
        - Membership number
        - Main member name
        - Dependent code (optional)
   → "Request Verification" button
        → creates a medical_aid_requests row (status = pending)
        → notifies the doctor
   → Patient sees status card: "Awaiting verification"
   → Doctor reviews and chooses one of:
        - Approve (sets approved rate + optional co-payment)
        - Reject (with reason)
        - Request co-payment (sets copay amount, status = copay_requested)
        - Request private payment instead (status = private_requested)
   → Patient is notified
   → Only when status = approved or copay_requested can the patient
     pick a date/time slot. Booking is linked to the request id.
```

A new patient subview **"Medical Aid Requests"** lists the patient's requests with statuses and lets them continue to slot selection once approved.

A new doctor subview **"Medical Aid Requests"** lets doctors approve / reject / set co-payment / convert to private.

## 3. Doctor-side medical aid configuration

Doctors configure (in their pricing area):
- **Supported medical aids**: provider name, optional plan
- **Consultation rate per scheme**
- **Default co-payment**
- **Requires authorization** toggle

The existing single `medical_aid` pricing tier is replaced by per-scheme rates so different schemes can have different rates and co-payments.

## 4. Doctor Wallet / Admin Financial Dashboard (unchanged behavior)

All financial breakdowns (gross, platform fee, processing fee, fixed fee, VAT, net payout, settlement history) stay visible **only** in:
- `DoctorWallet.tsx`
- Doctor Earnings
- `AdminFinancialSettings.tsx` / Admin financials

No change to the fee calculator engine itself.

---

## Technical details

### Database migration

New tables:

- `doctor_medical_aids`
  - `doctor_id uuid`, `scheme_name text`, `plan text NULL`,
    `consultation_rate numeric`, `default_copayment numeric DEFAULT 0`,
    `requires_authorization boolean DEFAULT false`, `is_active boolean DEFAULT true`
  - RLS: doctor manages own; public can SELECT active rows (for patient dropdown).

- `medical_aid_requests`
  - `patient_id`, `doctor_id`, `dependent_id NULL`,
    `scheme_name`, `plan`, `membership_number`, `main_member_name`, `dependent_code NULL`,
    `status text` ∈ `pending | approved | rejected | copay_requested | private_requested | cancelled`,
    `approved_rate numeric NULL`, `copayment_amount numeric NULL`,
    `doctor_notes text NULL`, `appointment_id uuid NULL` (set once a slot is booked),
    timestamps.
  - RLS: patient sees own; doctor sees their own; admin sees all; patient inserts own; doctor updates own; patient cancels own.
  - Trigger: notify doctor on insert; notify patient on status change.

Appointments table: add nullable `medical_aid_request_id uuid` to link a booked slot back to the approved request.

### Frontend changes

- `src/components/patient/BookAppointment.tsx`
  - Strip fee calculator imports and breakdown UI; show only consultation fee line.
  - Branch on `paymentMethodType`:
    - `card` → continue current slot picker + Paystack flow.
    - `medical_aid` → render `<MedicalAidRequestForm />` instead of slot picker; disable slot picker until an approved request is selected.
  - When an approved request exists, show a compact "Verified – R<approved_rate> (+ co-pay R<x>)" banner and re-enable slot selection. Booking insert includes `medical_aid_request_id`, `pricing_tier_type='medical_aid'`, and uses the approved rate.
- `src/components/patient/MedicalAidRequests.tsx` (new): list, status badges, "Continue to booking" CTA for approved/copay rows.
- `src/components/doctor/MedicalAidRequests.tsx` (new): inbox with Approve / Reject / Request Co-payment / Convert to Private actions.
- `src/components/doctor/MedicalAidConfig.tsx` (new): CRUD for `doctor_medical_aids`.
- `src/pages/PatientDashboard.tsx` and `src/pages/DoctorDashboard.tsx`: add the new tabs.
- Remove `medical_aid` tier auto-pricing in `PricingTiers.tsx` (or repurpose as fallback) since rates now come from `doctor_medical_aids`.

### Wording updates

- Card method card subtitle: "Pay now with card. Instant confirmation."
- Medical aid method card subtitle: **"Submit your medical aid details for approval and scheduling."**
- Empty/disabled state under medical aid: **"Medical aid consultations require verification before booking."**

### Out of scope (kept as-is)

- Fee calculator engine and `platform_fee_settings`.
- DoctorWallet, Admin Financial Settings, Earnings dashboard internals.
- Paystack integration (still used for card and for co-payment when applicable).

---

Approve this plan and I'll run the migration and implement the UI in one pass.
