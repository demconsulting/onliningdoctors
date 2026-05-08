# Doctor Pricing, Wallet & Earnings System

A Phase-1 fintech-grade pricing + wallet experience for doctors, with mobile-first UI, transparent fee breakdowns, and a future-ready schema.

## 1. Pricing System (Multi-tier)

Replace single `consultation_fee` workflow with up to 4 configurable consultation types per doctor:

- **Private / Card** (required)
- **Medical Aid** (optional)
- **Follow-up** (optional)
- **Specialist** (optional)

UI: redesign `PricingTiers.tsx` into a card-grid form. Each tier:
- toggle (active/inactive)
- price input (validated against the existing `consultation_categories` band)
- short description
- duration (default 30 min)

Storage: reuse existing `doctor_pricing_tiers` table (already has `name`, `price`, `duration_minutes`, `is_active`). Add a typed `tier_type` enum column (`private | medical_aid | follow_up | specialist`) so booking can resolve fees deterministically. Keep `doctors.consultation_fee` synced to the lowest active tier (existing behavior preserved for directory listing).

## 2. Patient Booking — Payment Method Selection

In `BookAppointment.tsx`, after doctor + slot:
- Step "Payment method": `Card Payment` or `Medical Aid Verification`
- Resolve fee from the matching `doctor_pricing_tiers` row (`private` vs `medical_aid`); fallback to `private` if medical aid not set, with a notice
- Show transparent breakdown (fee, platform 10%, processing ~R5.50, doctor net) before paying
- Persist the chosen `payment_method_type` and `tier_type` on `appointments` (new nullable columns) and on `payments.metadata`

Phase 1 medical-aid: just records the patient's intent + scheme info (already collected). Doctor later marks outcome as `covered | co_payment | private` from appointment detail. No claim processing.

## 3. Wallet System (new Doctor tab)

New tab `Wallet` in `DoctorDashboard.tsx` (replaces/absorbs the lazy `earnings` route). Component: `DoctorWallet.tsx`.

**Summary cards** (localized currency from doctor's country):
- Available Balance — paid payments not yet in a paid payout
- Pending Balance — payments in `pending|processing` or appts awaiting completion
- Total Earnings (lifetime net)
- Total Platform Fees
- Total Withdrawals (sum of paid payouts)

**Earnings chart**: 30-day net earnings AreaChart (reuse style from `DoctorEarnings.tsx`).

**Transaction table**:
columns — Date · Patient · Type · Gross · Platform Fee · Processing Fee · Net · Status. Filters: date range, type, status. Mobile: card list.

Statuses derived from `payments.status` + payout linkage:
`pending | processing | paid | failed | refunded`.

**Fee transparency block** — explicit formula card (Gross → −Platform 10% → −Processing → Net) so every doctor sees how the math works.

## 4. Payout Workflow

Reuse existing `payout_requests` table.

- "Request Withdrawal" button — opens modal with available balance, minimum payout (R200), confirms bank details from `doctor_billing`
- Inserts a `payout_requests` row with all currently-available `payment_ids`, status `pending`
- Section "Payouts" lists requests with statuses `pending | processing | paid` (admin-controlled in `AdminPayouts.tsx`)
- Optional toggle "Enable weekly auto-payout" — stored on doctor (Phase-1 visual only; backend cron can be added later)

## 5. Transaction Types

Add `transaction_type` to `payments` (nullable):
`card_consultation | medical_aid_consultation | co_payment | refund | adjustment`.

Adjustments/refunds insertable only by admin via existing AdminPayments path (no UI changes here).

## 6. Schema changes (migration)

```
-- Pricing tier typing
create type pricing_tier_type as enum ('private','medical_aid','follow_up','specialist');
alter table doctor_pricing_tiers add column tier_type pricing_tier_type;

-- Booking metadata
alter table appointments
  add column payment_method_type text,   -- 'card' | 'medical_aid'
  add column pricing_tier_type pricing_tier_type;

-- Payment categorisation
alter table payments add column transaction_type text;

-- Doctor preferences
alter table doctors add column auto_weekly_payout boolean not null default false;
```

No RLS changes required — new columns inherit existing policies.

## 7. Files

Created
- `src/components/doctor/DoctorWallet.tsx`
- `src/components/doctor/WalletTransactionsTable.tsx`
- `src/components/doctor/WalletPayoutPanel.tsx`
- `src/components/patient/PaymentMethodStep.tsx`

Edited
- `src/components/doctor/PricingTiers.tsx` — multi-tier editor
- `src/pages/DoctorDashboard.tsx` — add Wallet tab; remove standalone Earnings tab
- `src/components/doctor/DoctorOverview.tsx` — link "Earnings" quick action to Wallet
- `src/components/patient/BookAppointment.tsx` — payment-method step + fee breakdown + persist tier
- `supabase/functions/paystack-payment/index.ts` — accept `tier_type` + `transaction_type`, store on payment

## 8. Out of scope (Phase 1)

- Real medical-aid claim submission / EDI
- Practice-level revenue splitting (schema is forward-compatible via existing `practices` link)
- Automated cron payouts (toggle is UI-only)
- Subscription billing
