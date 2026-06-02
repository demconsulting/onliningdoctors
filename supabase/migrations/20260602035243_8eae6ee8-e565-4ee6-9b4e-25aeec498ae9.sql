-- Doctor Profile Change Management
CREATE TYPE public.profile_change_status AS ENUM ('pending','approved','rejected');

CREATE TABLE public.doctor_profile_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL,
  field_name text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  status public.profile_change_status NOT NULL DEFAULT 'pending',
  rejection_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dpc_doctor_status ON public.doctor_profile_changes(doctor_id, status);
CREATE INDEX idx_dpc_status_created ON public.doctor_profile_changes(status, created_at DESC);

GRANT SELECT, INSERT ON public.doctor_profile_changes TO authenticated;
GRANT ALL ON public.doctor_profile_changes TO service_role;

ALTER TABLE public.doctor_profile_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors insert own profile changes"
  ON public.doctor_profile_changes FOR INSERT TO authenticated
  WITH CHECK (doctor_id = auth.uid() AND public.has_role(auth.uid(),'doctor'));

CREATE POLICY "Doctors view own profile changes"
  ON public.doctor_profile_changes FOR SELECT TO authenticated
  USING (doctor_id = auth.uid());

CREATE POLICY "Admins view all profile changes"
  ON public.doctor_profile_changes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins update profile changes"
  ON public.doctor_profile_changes FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Approval RPC: applies new_value to the appropriate target table
CREATE OR REPLACE FUNCTION public.approve_profile_change(_change_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_change public.doctor_profile_changes%ROWTYPE;
  v_text text;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Only admins can approve profile changes';
  END IF;

  SELECT * INTO v_change FROM public.doctor_profile_changes WHERE id = _change_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Change not found'; END IF;
  IF v_change.status <> 'pending' THEN RAISE EXCEPTION 'Change already reviewed'; END IF;

  v_text := NULLIF(v_change.new_value #>> '{}', '');

  IF v_change.field_name = 'full_name' THEN
    UPDATE public.profiles SET full_name = v_text WHERE id = v_change.doctor_id;
  ELSIF v_change.field_name = 'license_number' THEN
    UPDATE public.doctors SET license_number = v_text WHERE profile_id = v_change.doctor_id;
  ELSIF v_change.field_name = 'specialty_id' THEN
    UPDATE public.doctors SET specialty_id = NULLIF(v_text,'')::uuid WHERE profile_id = v_change.doctor_id;
  ELSIF v_change.field_name = 'education' THEN
    UPDATE public.doctors SET education = v_text WHERE profile_id = v_change.doctor_id;
  ELSIF v_change.field_name = 'practice_name' THEN
    UPDATE public.doctors SET practice_name = v_text WHERE profile_id = v_change.doctor_id;
  ELSIF v_change.field_name = 'license_document_path' THEN
    UPDATE public.doctors SET license_document_path = v_text WHERE profile_id = v_change.doctor_id;
  ELSIF v_change.field_name = 'id_document_path' THEN
    UPDATE public.doctors SET id_document_path = v_text WHERE profile_id = v_change.doctor_id;
  ELSE
    RAISE EXCEPTION 'Unsupported field: %', v_change.field_name;
  END IF;

  UPDATE public.doctor_profile_changes
    SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
    WHERE id = _change_id;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (v_change.doctor_id, 'Profile Change Approved',
          'Your update to "' || v_change.field_name || '" was approved.',
          'success', '/doctor');
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_profile_change(_change_id uuid, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_change public.doctor_profile_changes%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Only admins can reject profile changes';
  END IF;
  IF _reason IS NULL OR length(trim(_reason)) = 0 THEN
    RAISE EXCEPTION 'Rejection reason required';
  END IF;

  SELECT * INTO v_change FROM public.doctor_profile_changes WHERE id = _change_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Change not found'; END IF;
  IF v_change.status <> 'pending' THEN RAISE EXCEPTION 'Change already reviewed'; END IF;

  UPDATE public.doctor_profile_changes
    SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), rejection_reason = _reason
    WHERE id = _change_id;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (v_change.doctor_id, 'Profile Change Rejected',
          'Your update to "' || v_change.field_name || '" was rejected. Reason: ' || _reason,
          'warning', '/doctor');
END;
$$;

-- Notify admins on new pending change
CREATE OR REPLACE FUNCTION public.notify_profile_change_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_id uuid;
  d_name text;
BEGIN
  SELECT full_name INTO d_name FROM profiles WHERE id = NEW.doctor_id;
  d_name := COALESCE(d_name, 'A doctor');
  FOR admin_id IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (admin_id, 'Doctor Profile Change Submitted',
            d_name || ' submitted a change to "' || NEW.field_name || '" for review.',
            'info', '/admin');
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_dpc_notify_submit
AFTER INSERT ON public.doctor_profile_changes
FOR EACH ROW EXECUTE FUNCTION public.notify_profile_change_submitted();
