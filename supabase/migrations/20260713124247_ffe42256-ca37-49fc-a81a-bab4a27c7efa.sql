-- 1. Table
CREATE TABLE public.consultation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('doctor','patient')),
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  CONSTRAINT consultation_messages_message_length CHECK (
    char_length(btrim(message)) BETWEEN 1 AND 1000
  )
);

CREATE INDEX consultation_messages_appointment_created_idx
  ON public.consultation_messages(appointment_id, created_at);
CREATE INDEX consultation_messages_sender_idx
  ON public.consultation_messages(sender_id);

-- 2. Grants (PostgREST needs these explicitly)
GRANT SELECT, INSERT ON public.consultation_messages TO authenticated;
GRANT ALL ON public.consultation_messages TO service_role;

-- 3. Row-Level Security
ALTER TABLE public.consultation_messages ENABLE ROW LEVEL SECURITY;

-- Patients + doctors read their own consultation's chat.
CREATE POLICY "Consultation participants can read messages"
ON public.consultation_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = consultation_messages.appointment_id
      AND (a.patient_id = auth.uid() OR a.doctor_id = auth.uid())
  )
);

-- Authorised admins read every consultation's chat for moderation.
CREATE POLICY "Admins can read all consultation messages"
ON public.consultation_messages
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'platform_admin')
);

-- Only the actual sender (patient OR doctor on this appointment) can insert.
-- Impersonation is impossible: sender_id must equal the current user AND the
-- current user must be the patient or doctor on the appointment.
CREATE POLICY "Participants can send messages to their consultation"
ON public.consultation_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = consultation_messages.appointment_id
      AND (
        (a.patient_id = auth.uid() AND sender_role = 'patient')
        OR (a.doctor_id = auth.uid() AND sender_role = 'doctor')
      )
      AND a.status IN ('confirmed','completed')
  )
);

-- No UPDATE / DELETE policies -> immutable audit trail for consultations.

-- 4. Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.consultation_messages;
ALTER TABLE public.consultation_messages REPLICA IDENTITY FULL;