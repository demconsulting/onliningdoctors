-- Fix 1: Scope patient cancel policy to authenticated role only
DROP POLICY IF EXISTS "Patients can cancel own appointments" ON public.appointments;
CREATE POLICY "Patients can cancel own appointments"
ON public.appointments
FOR UPDATE
TO authenticated
USING (
  (patient_id = auth.uid())
  AND (status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'awaiting_payment'::text]))
)
WITH CHECK (patient_id = auth.uid());

-- Fix 2: Tighten realtime topic policies to require a separator before the uid suffix,
-- preventing substring/spoof matches where a uid happens to appear at the end of an unrelated topic.
DROP POLICY IF EXISTS "Authenticated users read own topic" ON realtime.messages;
CREATE POLICY "Authenticated users read own topic"
ON realtime.messages
FOR SELECT
TO authenticated
USING (realtime.topic() LIKE ('%-' || auth.uid()::text));

DROP POLICY IF EXISTS "Authenticated users write own topic" ON realtime.messages;
CREATE POLICY "Authenticated users write own topic"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (realtime.topic() LIKE ('%-' || auth.uid()::text));