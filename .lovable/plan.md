
# Referral & Rewards Management System

A complete referral + rewards platform for Doctors Onlining covering all 4 referral directions (Doctor↔Patient), eligibility gating, anti-fraud, wallet/cash rewards, user dashboard, and admin center. Reuses existing patterns: `has_role()` RLS, `audit_logs`, `notifications`, `doctor_billing` for payouts.

---

## 1. Database (single migration, requires approval)

### New tables (all RLS-enabled, with GRANTs)

- **`referral_codes`** — one row per user. `user_id` (unique), `code` (unique, 8-char base32), `user_type` (doctor|patient), `total_clicks`, `created_at`. Auto-created on signup via trigger on `profiles`.
- **`referrals`** — the relationship + lifecycle. Fields: `id`, `referrer_id`, `referrer_type`, `referred_id` (nullable until registration), `referred_email`, `referred_type`, `code_used`, `signup_ip`, `signup_user_agent`, `device_fingerprint`, `status` (pending_signup | pending_verification | pending_first_consult | eligible | approved | rejected | fraud_detected | paid), `registration_date`, `verification_date`, `first_consultation_date`, `total_consultations`, `reward_amount`, `reward_type`, `reward_currency`, `reward_approved_at`, `reward_approved_by`, `reward_paid_at`, `flagged_reasons jsonb`, `admin_notes`, `created_at`, `updated_at`. Unique `(referred_id)` so a user can only be referred once.
- **`referral_reward_settings`** — admin-configurable matrix. Keyed by `(referrer_type, referred_type, country)`. Fields: `reward_type` (wallet_credit | cash | voucher | promo_credit), `amount`, `currency`, `is_enabled`, `requires_admin_approval`, `updated_by`, `updated_at`. Seed defaults for ZA: 0 amounts, wallet_credit, enabled=false → admin sets values.
- **`referral_rewards_ledger`** — every credit/debit. Fields: `user_id`, `referral_id`, `amount`, `currency`, `type` (credit|debit|payout), `status` (pending|approved|paid|reversed), `payout_method`, `payout_reference`, `created_at`. Drives the wallet balance.
- **`referral_fraud_flags`** — `referral_id`, `flag_type` (self_referral | duplicate_email | duplicate_phone | duplicate_id | same_ip | same_device | same_card | pattern), `severity` (block|review), `details jsonb`, `resolved`, `resolved_by`, `resolved_at`.
- **`referral_clicks`** — lightweight tracking: `code`, `ip`, `user_agent`, `referer`, `created_at` (for funnel analytics).

### Helper functions (SECURITY DEFINER)

- `generate_referral_code()` — collision-safe 8-char alphanumeric.
- `ensure_referral_code(_user_id)` — idempotent; called from `handle_new_user` trigger extension.
- `attach_referral_on_signup(_code text, _user_id uuid, _ip text, _ua text, _fp text)` — creates `referrals` row, runs anti-fraud checks (self / duplicate email/phone/ID via `profiles.id_number_hash`), inserts blocking `referral_fraud_flags` if any; otherwise status=`pending_verification`.
- `evaluate_referral_eligibility(_referred_id)` — checks email/phone verified, ID uploaded & approved, first completed consultation; for doctors also HPCSA + profile completion. Advances status to `eligible` when met, computes `reward_amount` from settings, writes `referral_rewards_ledger` (pending), notifies referrer.
- `admin_approve_referral_reward(_referral_id)` / `admin_reject_referral_reward(_referral_id, _reason)` — admin-only, moves ledger row to approved/paid for wallet credits, leaves cash payouts in approved-awaiting-payout queue.
- `get_user_referral_stats(_user_id)` — returns totals, pending, approved, earnings (pending/paid).
- `admin_referral_overview()` / `admin_top_referrers(_limit)` / `admin_referral_funnel()` — for admin dashboard.

### Triggers
- `profiles AFTER INSERT` → `ensure_referral_code`.
- `appointments AFTER UPDATE OF status` (status='completed') → call `evaluate_referral_eligibility(patient_id)` and `(doctor_id)`.
- `doctors AFTER UPDATE OF is_verified` → re-evaluate eligibility for that doctor's referral.
- All admin reward actions write to `audit_logs` via existing `log_audit_event_self`.

### Initial launch defaults (per spec)
- Tracking, identity verification gating, manual approval, wallet credits, fraud detection: **ON**.
- Automatic cash payouts, multi-level: **OFF** (`auto_cash_payout` and `multi_level` columns in a single-row `referral_program_settings` table, default false).

---

## 2. Frontend — referral capture

- **New route `/ref/:code`** (`src/pages/ReferralLanding.tsx`) — logs click to `referral_clicks`, stores `{code, ts}` in `localStorage` (key `do_referral`), then redirects to `/signup?ref=CODE` (or `/signup/doctor?ref=CODE` if `?as=doctor`).
- **Signup flows** (`Signup.tsx`, `DoctorSignup.tsx`, `GoogleAuthButton.tsx`, `GoogleOneTap.tsx`): read `localStorage.do_referral`, after successful auth call `attach_referral_on_signup` RPC with code + IP/UA/device fingerprint (FingerprintJS lite via `navigator.userAgent` + screen + tz hash — no external dep). Clear localStorage after attach.

---

## 3. Frontend — user Referral Center

New shared component `src/components/referrals/ReferralCenter.tsx` mounted in:
- Patient dashboard (`src/pages/Dashboard.tsx`) — new "Referrals" tab.
- Doctor dashboard (`src/pages/DoctorDashboard.tsx`) — new "Referrals" tab.

Shows: referral link, QR (via `qrcode` lib — add dep), totals (total/pending/approved), earnings (pending/paid), and a table of their referrals with status badges. Actions: Copy link, Share WhatsApp (`wa.me`), Share Email (`mailto:`), Download QR (canvas → png).

Reward currency follows the existing localization rule (doctor's country → `getCurrencySymbol`).

---

## 4. Frontend — Admin Referral & Rewards

New admin section `recruitment-crm`-style:
- Sidebar item **"Referral & Rewards"** key `referrals` (icon `Gift`).
- `src/components/admin/referrals/AdminReferralsCenter.tsx` with tabs:
  1. **Overview** — KPI cards (total/doctor/patient referrals, conversion %, pending/paid rewards, fraud flags).
  2. **Top Referrers** — sortable table.
  3. **Pending Approvals** — approve/reject buttons calling RPCs.
  4. **Fraud Monitoring** — list of `referral_fraud_flags`, resolve actions.
  5. **Reward Settings** — editable matrix (4 combinations × country) with amount, type, enable toggle.
  6. **Payout Management** — approved cash rewards awaiting payout; mark as paid (writes ledger + audit log).
  7. **Analytics** — referrals by month/province/specialty (recharts), funnel.

Wired into `AdminDashboard.tsx` loader map and `AdminSidebar.tsx`.

---

## 5. Out of scope (do not touch)
Existing appointment, payment, verification, founding doctor, recruitment CRM logic. We only add triggers that read these tables.

---

## 6. Order of execution
1. Migration (tables + functions + triggers + seed settings + GRANTs + RLS).
2. Add `qrcode` dependency.
3. Build `/ref/:code` route + signup integration.
4. Build user Referral Center + mount in dashboards.
5. Build admin Referral & Rewards section + sidebar entry.
6. Verify build, smoke-test referral flow.

Approve to proceed with the migration as step 1.
