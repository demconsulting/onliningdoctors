
-- Drop the existing permissive INSERT policy
DROP POLICY IF EXISTS "Users can send signaling messages" ON public.webrtc_signaling_messages;

-- Replace with a policy that validates appointment ownership and status
CREATE POLICY "Users can send signaling for their appointments"
ON public.webrtc_signaling_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM appointments
    WHERE appointments.id = webrtc_signaling_messages.appointment_id
    AND (appointments.patient_id = auth.uid() OR appointments.doctor_id = auth.uid())
    AND appointments.status IN ('confirmed', 'completed')
  )
);
