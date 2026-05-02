-- Restore SELECT on reviews.patient_id for authenticated users so admins
-- (and patients viewing their own reviews) can still embed/read it.
-- The anonymous role remains revoked: anon visitors cannot see patient UUIDs
-- via the public "Anyone can view approved visible reviews" policy.
GRANT SELECT (patient_id) ON public.reviews TO authenticated;