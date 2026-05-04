
-- 1. Public SELECT policy for avatars bucket
DROP POLICY IF EXISTS "Public can read avatars" ON storage.objects;
CREATE POLICY "Public can read avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- 2. Restrict realtime broadcast inserts to user's own notifications topic
DROP POLICY IF EXISTS "Users can broadcast to own notifications topic" ON realtime.messages;
CREATE POLICY "Users can broadcast to own notifications topic"
ON realtime.messages FOR INSERT
TO authenticated
WITH CHECK (
  realtime.topic() = 'notifications-' || auth.uid()::text
);

-- 3. Block doctors from self-modifying suspension fields via trigger
CREATE OR REPLACE FUNCTION public.prevent_doctor_suspension_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    IF NEW.is_suspended IS DISTINCT FROM OLD.is_suspended
       OR NEW.suspension_reason IS DISTINCT FROM OLD.suspension_reason THEN
      RAISE EXCEPTION 'Only admins can modify suspension fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_doctor_suspension_self_update_trg ON public.doctors;
CREATE TRIGGER prevent_doctor_suspension_self_update_trg
BEFORE UPDATE ON public.doctors
FOR EACH ROW
EXECUTE FUNCTION public.prevent_doctor_suspension_self_update();

-- 4. Admin SELECT policy on appointments
DROP POLICY IF EXISTS "Admins can view all appointments" ON public.appointments;
CREATE POLICY "Admins can view all appointments"
ON public.appointments FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
