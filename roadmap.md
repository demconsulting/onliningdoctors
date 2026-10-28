# Group practice foundation
- [x] Extend existing practice schema and secure practice-admin access without changing cash booking.
- [x] Add practice details and doctor membership dashboard with role-based navigation.
- [x] Add doctor regulatory profile fields and validate the requested rules.
- [x] Verify signed-out navigation, four tests, successful app checks and schema; authenticated end-to-end checks unavailable for external unmanaged Supabase.

# Practice pre-phase review
- [x] Document live practice schema, policies, enums and payout relationships.
- [x] Verify the five group-practice security-definer functions and fix unsafe access; executed database denial tests and four frontend tests.
- [x] Public-logo migration superseded: user requests private group-practice-logos with authenticated reads.
- [x] Confirm existing administrator assignment control and document how to use it; real-account browser checks unavailable with external unmanaged Supabase.

# Phase 6A fix
- [x] Audit currency counts and live Paystack currency; ZAR defaults changed without modifying existing rows.
- [x] Harden definer view and function grants; report 118 remaining findings; leave no-policy table unchanged.
- [x] Add platform-admin-only administrator removal with last-link role cleanup; rollback-only database tests passed.
- [x] Distinguish practice dashboard navigation labels.
- [x] Confirm authenticated private logo reads without widening writes; public browser and four unit tests passed; signed-in end-to-end checks unavailable for external unmanaged Supabase.