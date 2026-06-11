
-- Add 'needs_info' status
ALTER TYPE public.profile_change_status ADD VALUE IF NOT EXISTS 'needs_info';

-- Add info request message column
ALTER TABLE public.doctor_profile_changes
  ADD COLUMN IF NOT EXISTS info_request_message text;

-- RPC: admin requests additional information for a pending change
CREATE OR REPLACE FUNCTION public.request_profile_change_info(_change_id uuid, _message text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_change public.doctor_profile_changes%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Only admins can request information';
  END IF;
  IF _message IS NULL OR length(trim(_message)) = 0 THEN
    RAISE EXCEPTION 'Message required';
  END IF;

  SELECT * INTO v_change FROM public.doctor_profile_changes WHERE id = _change_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Change not found'; END IF;
  IF v_change.status <> 'pending' THEN RAISE EXCEPTION 'Change already reviewed'; END IF;

  UPDATE public.doctor_profile_changes
    SET status = 'needs_info',
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        info_request_message = _message
    WHERE id = _change_id;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (
    v_change.doctor_id,
    'Additional Information Required',
    'Admin requested more info on your "' || v_change.field_name || '" update: ' || _message,
    'warning',
    '/doctor'
  );
END;
$$;

-- Improve admin in-app notification message and link
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
    VALUES (
      admin_id,
      'Doctor Profile Change Requires Review',
      d_name || ' submitted a change to "' || NEW.field_name || '" requiring admin approval.',
      'info',
      '/admin?section=profile-reviews'
    );
  END LOOP;
  RETURN NEW;
END;
$$;
