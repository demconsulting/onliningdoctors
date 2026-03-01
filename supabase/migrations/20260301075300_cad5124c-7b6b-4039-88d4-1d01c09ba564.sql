CREATE OR REPLACE FUNCTION public.log_sensitive_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Skip audit logging if no authenticated user (e.g. during auth triggers)
  IF auth.uid() IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, details)
    VALUES (
      auth.uid(),
      'update',
      TG_TABLE_NAME,
      NEW.id::text,
      jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW))
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, details)
    VALUES (
      auth.uid(),
      'delete',
      TG_TABLE_NAME,
      OLD.id::text,
      jsonb_build_object('old', to_jsonb(OLD))
    );
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, details)
    VALUES (
      auth.uid(),
      'insert',
      TG_TABLE_NAME,
      NEW.id::text,
      jsonb_build_object('new', to_jsonb(NEW))
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$function$;