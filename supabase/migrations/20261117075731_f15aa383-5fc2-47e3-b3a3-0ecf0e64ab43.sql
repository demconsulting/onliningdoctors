CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;
ALTER FUNCTION public.get_current_consultation_history(uuid) SET SCHEMA private;
REVOKE ALL ON FUNCTION private.get_current_consultation_history(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.get_current_consultation_history(uuid) TO authenticated;
CREATE FUNCTION public.get_current_consultation_history(_appointment_id uuid)
RETURNS jsonb
LANGUAGE sql
VOLATILE
SECURITY INVOKER
SET search_path = public
AS $function$
  SELECT private.get_current_consultation_history(_appointment_id);
$function$;
REVOKE ALL ON FUNCTION public.get_current_consultation_history(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_consultation_history(uuid) TO authenticated;