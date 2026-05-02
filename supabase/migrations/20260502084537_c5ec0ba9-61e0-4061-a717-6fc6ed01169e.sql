-- 1) Revoke direct column access to reviews.patient_id from anon and authenticated.
--    Admins (service role) and the column owner are unaffected. Owner-row reads
--    still work because RLS-enforced policies select via the table definition,
--    but reading the column itself now requires a privileged role. Application
--    queries should select reviews without patient_id; patient ownership is
--    enforced via RLS using auth.uid() server-side.
REVOKE SELECT (patient_id) ON public.reviews FROM anon, authenticated;

-- 2) Replace permissive realtime.messages topic policies with a strict
--    suffix match: topic must END with the caller's UUID (e.g. "signaling-<aid>-<uid>").
--    This eliminates the substring-spoofing risk flagged by the scanner.
DROP POLICY IF EXISTS "Authenticated users read own topic" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated users write own topic" ON realtime.messages;

CREATE POLICY "Authenticated users read own topic"
ON realtime.messages
FOR SELECT
TO authenticated
USING (realtime.topic() LIKE ('%' || auth.uid()::text));

CREATE POLICY "Authenticated users write own topic"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (realtime.topic() LIKE ('%' || auth.uid()::text));