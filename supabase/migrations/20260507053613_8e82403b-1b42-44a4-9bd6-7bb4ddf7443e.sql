
-- 1. Doctors: prevent self-update of verification/suspension fields
CREATE OR REPLACE FUNCTION public.prevent_doctor_suspension_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    IF NEW.is_suspended IS DISTINCT FROM OLD.is_suspended
       OR NEW.suspension_reason IS DISTINCT FROM OLD.suspension_reason
       OR NEW.is_verified IS DISTINCT FROM OLD.is_verified THEN
      RAISE EXCEPTION 'Only admins can modify verification or suspension fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_doctor_self_suspension_trigger ON public.doctors;
CREATE TRIGGER prevent_doctor_self_suspension_trigger
BEFORE UPDATE ON public.doctors
FOR EACH ROW EXECUTE FUNCTION public.prevent_doctor_suspension_self_update();

-- Add WITH CHECK to doctor self-update policy
DROP POLICY IF EXISTS "Doctors can update own profile" ON public.doctors;
CREATE POLICY "Doctors can update own profile"
ON public.doctors
FOR UPDATE
TO authenticated
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

-- 2. Profiles: restrict public exposure - drop overly broad public policy
DROP POLICY IF EXISTS "Public can view profiles of doctors" ON public.profiles;

-- Create a public view exposing only safe doctor + profile fields
CREATE OR REPLACE VIEW public.public_doctors
WITH (security_invoker = true)
AS
SELECT
  d.id,
  d.profile_id,
  d.specialty_id,
  d.title,
  d.bio,
  d.experience_years,
  d.consultation_fee,
  d.rating,
  d.total_reviews,
  d.is_available,
  d.languages,
  d.education,
  d.hospital_affiliation,
  d.is_verified,
  d.is_suspended,
  d.practice_name,
  d.practice_logo_url,
  d.consultation_category_id,
  p.full_name,
  p.avatar_url,
  p.city,
  p.country
FROM public.doctors d
LEFT JOIN public.profiles p ON p.id = d.profile_id
WHERE d.is_verified = true AND d.is_suspended = false;

GRANT SELECT ON public.public_doctors TO anon, authenticated;

-- Re-add a narrow profiles select policy: authenticated users may read minimal profile info of verified doctors via direct queries (still needed for in-app joins on appointments etc.)
CREATE POLICY "Authenticated can view doctor profile basics"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.doctors
    WHERE doctors.profile_id = profiles.id
      AND doctors.is_verified = true
      AND doctors.is_suspended = false
  )
);

-- 3. audit_logs: remove client INSERT policy (system-only)
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;

-- 4. notifications: restrict client INSERT to admins (legitimate cases are admin-triggered moderation actions)
DROP POLICY IF EXISTS "Users can create own notifications" ON public.notifications;
CREATE POLICY "Admins can create notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
