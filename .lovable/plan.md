# Doctor Dashboard Redesign — Phase 1

Goal: cut onboarding fatigue. Surface only what a doctor needs to start taking bookings; tuck the rest behind "Advanced Settings" and a profile-completion nudge.

## 1. New navigation (DoctorDashboard.tsx)

Replace the current 7-tab strip with a cleaner tab set, mobile-first (horizontal scroll on small screens, sidebar feel on desktop via wider tabs):

1. **Dashboard** (new — overview)
2. **Appointments** (existing)
3. **Availability** (existing)
4. **Pricing** (existing)
5. **Profile** (simplified)
6. **Payments** (renamed from Billing, payout-focused)
7. **Wellness+** (Coming Soon teaser)

Move under a collapsible **Advanced Settings** panel inside Profile/Payments:
- Practice registration / team management
- Company billing entity
- SWIFT/international payout fields
- Prescription templates
- Document uploads, branding, hospital affiliation, languages, qualifications, bio

(Templates + Prescriptions stay accessible via Appointments row actions / a small link in Advanced — they remain functional, just not top-level tabs in Phase 1.)

## 2. New Dashboard (Overview) tab

New component `src/components/doctor/DoctorOverview.tsx`:

**Top stat cards (4):**
- Today's Appointments (count + next time)
- Upcoming Consultations (next 7 days)
- This Month's Earnings (localized currency)
- Profile Completion % (progress bar)

**Profile completion card:**
- Computes % from filled fields: photo, specialty, HPCSA #, phone, fee set, availability set, bio, qualifications, languages, hospital, documents
- Lists 2–3 next suggested actions with deep links
- Dismissible per-field hints

**Quick actions row:**
- Go Online / Offline (toggles `doctors.is_available`)
- Set Availability → Availability tab
- View Appointments → Appointments tab
- Update Pricing → Pricing tab

**Wellness+ teaser card** at the bottom with "Join Early Access" CTA (writes to a simple `wellness_plus_interest` flag in profile metadata, or just a toast for Phase 1).

## 3. Profile simplification (DoctorProfile.tsx)

**Essentials card (always visible):**
- Full Name, HPCSA Registration Number (renamed from License), Specialty, Phone, Email (read-only), Profile Photo

Helper text under HPCSA field: *"This number is verified with the Health Professions Council of South Africa (HPCSA)."*

**Advanced Settings (collapsible, closed by default):**
- Bio, Qualifications, Languages, Hospital Affiliation, Additional Certifications, Documents, Practice section (the unified "Your Practice" card already added — now framed as **"Register a Practice (Optional) — For clinics and multi-doctor practices only."**)

## 4. Payments tab (rename of Billing)

Rename tab label "Billing" → **Payments**. Inside DoctorBilling.tsx:

**Payout Settings (essentials):**
- Bank Name, Account Holder, Account Number, Branch Code, Account Type

**Advanced (collapsible):**
- SWIFT code (gated behind an "Enable international payouts" toggle)
- Company/Practice billing entity (existing logic preserved — only shown if no Practice and the doctor toggles "Bill as company")

## 5. Wellness+ tab

Static premium card, no backend wiring beyond a toast on "Join Early Access". Copy as in the brief (AI wellness guidance, educational only, encourages consultations).

## 6. Terminology sweep

Search the project for user-visible "License Number" strings on doctor-facing pages and replace with "HPCSA Registration Number" + helper. Scope: DoctorProfile, DoctorSignup, any verification banners. Keep DB column `license_number` unchanged.

## Files touched

- `src/pages/DoctorDashboard.tsx` — new tab set, lazy-load Overview, Wellness+
- `src/components/doctor/DoctorOverview.tsx` — NEW
- `src/components/doctor/DoctorWellnessPlus.tsx` — NEW
- `src/components/doctor/DoctorProfile.tsx` — split essentials vs advanced collapsible, rename license label
- `src/components/doctor/DoctorBilling.tsx` — payout-first layout, advanced collapsible, international toggle
- `src/pages/DoctorSignup.tsx` — relabel license field (light touch)

## Out of scope (Phase 1)

- No DB schema changes
- No removal of existing Practice / Templates / Prescriptions features — only re-homed
- No changes to patient-facing flows