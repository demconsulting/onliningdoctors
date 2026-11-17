# Group practice foundation
- [x] Repair authenticated automatic doctor reminders; scheduled runs and delivery confirmations verified for four incomplete doctors.
- [x] Align scheduling completion checks; six reminder regression tests passed and app checks succeeded (external Supabase admin UI testing unavailable).
- [x] Extend existing practice schema and secure practice-admin access without changing cash booking.
- [x] Add practice details and doctor membership dashboard with role-based navigation.
- [x] Add doctor regulatory profile fields and validate the requested rules.
- [x] Verify signed-out navigation, four tests, successful app checks and schema; authenticated end-to-end checks unavailable for external unmanaged Supabase.

# Solo practice medical aid setup
- [x] Replace group-only labels with practice labels and expose solo-owner registration and medical aid settings.
- [x] Preserve existing approvals, team relationships and payout routing; solo registration/save/reload verified with synthetic phone/desktop tests. Real signed-in checks remain unavailable for external unmanaged Supabase.

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

# Current-consultation medical history
- [x] Add audited, treating-doctor-only access to previous consultations without widening direct record access; private reader and public invoker entry point introduce no new security warnings.
- [x] Show history automatically during consultations and keep dependent records separate; uploaded documents still require explicit sharing.
- [x] Verify access boundaries with rollback-only database checks and 34 passing app tests; synthetic phone/desktop displays and access removal passed with no runtime errors. Real signed-in consultation checks remain unavailable for external unmanaged Supabase.
- [x] Check full doctor-dashboard appointment lists and consultation routes with three synthetic patients in light/dark themes at 390px/1280px widths; inspect every prior consultation, medicine and prescription, open each patient's prescription form, switch chat, and confirm completion removes history. Corrected floating-help obstruction, dark warning contrast and clipped phone call controls; 34 tests pass. Real-account end-to-end verification remains unavailable for external unmanaged Supabase.