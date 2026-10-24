# Architecture rules
- Extend existing practice tables additively; never replace the legacy team, approval or payout relationships because cash booking must remain compatible.
- The separate group-practice dashboard uses scoped practice-admin assignments and role-checked RPCs; keep the existing practice financial dashboard independent.
- HPCSA and individual BHF columns are generated aliases of existing license/BHF fields; edit the source fields to preserve identity approval and avoid diverging credentials.
- Booking-directory RPCs return only active, non-banking practice/member fields rather than granting all authenticated users access to sensitive legacy rows.
- Foundation doctor membership does not mutate doctors.practice_id or payout approval; legacy owner approval continues governing cash settlement.
- Practice logos use private storage with signed URLs and practice-scoped write policies because workspace policy prohibits public buckets.
- Practice administrator links are created or changed only by platform admins; a global practice_admin role alone never authorizes a practice, and the legacy payout-manager relationships remain separate.