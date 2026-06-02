-- Ensure authenticated users can reach existing appointment/payment/dependent data through the Data API.
GRANT SELECT, INSERT, UPDATE ON public.appointments TO authenticated;
GRANT SELECT ON public.dependents TO authenticated;
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
GRANT ALL ON public.payments TO service_role;

-- Rebuild appointment read policies around the existing production appointments table.
DROP POLICY IF EXISTS "Patients can view own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Patient guardians can view dependent appointments" ON public.appointments;
DROP POLICY IF EXISTS "Linked dependent can view own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Doctors can view their appointments" ON public.appointments;
DROP POLICY IF EXISTS "Doctors can view linked profile appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can view all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Practice staff view practice appointments" ON public.appointments;

CREATE POLICY "Patients can view own appointments"
ON public.appointments
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (patient_id = auth.uid());

CREATE POLICY "Patient guardians can view dependent appointments"
ON public.appointments
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  dependent_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.dependents d
    WHERE d.id = appointments.dependent_id
      AND d.guardian_id = auth.uid()
  )
);

CREATE POLICY "Linked dependent can view own appointments"
ON public.appointments
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  dependent_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.dependents d
    WHERE d.id = appointments.dependent_id
      AND d.linked_user_id = auth.uid()
      AND d.consent_accepted_at IS NOT NULL
  )
);

CREATE POLICY "Doctors can view their appointments"
ON public.appointments
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  doctor_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.doctors d
    WHERE d.profile_id = auth.uid()
      AND (d.profile_id = appointments.doctor_id OR d.id = appointments.doctor_id)
  )
);

CREATE POLICY "Practice staff view practice appointments"
ON public.appointments
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.doctors d
    JOIN public.practice_members pm ON pm.practice_id = d.practice_id
    WHERE (d.profile_id = appointments.doctor_id OR d.id = appointments.doctor_id)
      AND pm.user_id = auth.uid()
      AND pm.status = 'active'::practice_member_status
  )
);

CREATE POLICY "Admins can view all appointments"
ON public.appointments
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Payment audit visibility for appointment dashboards without exposing payments publicly.
DROP POLICY IF EXISTS "Patients can view own payments" ON public.payments;
DROP POLICY IF EXISTS "Patients can view dependent appointment payments" ON public.payments;
DROP POLICY IF EXISTS "Linked dependents can view own appointment payments" ON public.payments;
DROP POLICY IF EXISTS "Doctors can view payments for their appointments" ON public.payments;
DROP POLICY IF EXISTS "Practice staff can view payments for practice appointments" ON public.payments;
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;

CREATE POLICY "Patients can view own payments"
ON public.payments
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (patient_id = auth.uid());

CREATE POLICY "Patients can view dependent appointment payments"
ON public.payments
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  appointment_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.appointments a
    JOIN public.dependents d ON d.id = a.dependent_id
    WHERE a.id = payments.appointment_id
      AND d.guardian_id = auth.uid()
  )
);

CREATE POLICY "Linked dependents can view own appointment payments"
ON public.payments
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  appointment_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.appointments a
    JOIN public.dependents d ON d.id = a.dependent_id
    WHERE a.id = payments.appointment_id
      AND d.linked_user_id = auth.uid()
      AND d.consent_accepted_at IS NOT NULL
  )
);

CREATE POLICY "Doctors can view payments for their appointments"
ON public.payments
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  doctor_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.appointments a
    JOIN public.doctors d ON d.profile_id = auth.uid()
    WHERE a.id = payments.appointment_id
      AND (a.doctor_id = d.profile_id OR a.doctor_id = d.id OR payments.doctor_id = d.profile_id OR payments.doctor_id = d.id)
  )
);

CREATE POLICY "Practice staff can view payments for practice appointments"
ON public.payments
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  appointment_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.appointments a
    JOIN public.doctors d ON (d.profile_id = a.doctor_id OR d.id = a.doctor_id)
    JOIN public.practice_members pm ON pm.practice_id = d.practice_id
    WHERE a.id = payments.appointment_id
      AND pm.user_id = auth.uid()
      AND pm.status = 'active'::practice_member_status
  )
);

CREATE POLICY "Admins can view all payments"
ON public.payments
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));