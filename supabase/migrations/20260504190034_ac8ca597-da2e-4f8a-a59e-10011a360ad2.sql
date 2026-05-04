-- Anonymous users must not be able to read patient identifiers from public reviews
REVOKE SELECT (patient_id, admin_notes, flagged_reason) ON public.reviews FROM anon;