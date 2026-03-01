
-- Create audit log table
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL, -- 'read', 'update', 'insert', 'delete'
  table_name text NOT NULL,
  record_id text,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow authenticated users to insert (so triggers/functions can log)
CREATE POLICY "Authenticated users can insert audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Index for common queries
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs (user_id);
CREATE INDEX idx_audit_logs_table_name ON public.audit_logs (table_name);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs (created_at DESC);

-- Trigger function to auto-log updates on sensitive tables
CREATE OR REPLACE FUNCTION public.log_sensitive_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
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
$$;

-- Attach triggers to sensitive tables
CREATE TRIGGER audit_profiles_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_change();

CREATE TRIGGER audit_patient_medical_info_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.patient_medical_info
  FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_change();

CREATE TRIGGER audit_patient_documents_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.patient_documents
  FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_change();

CREATE TRIGGER audit_appointments_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_change();

CREATE TRIGGER audit_user_roles_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_change();

CREATE TRIGGER audit_document_sharing_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.document_sharing
  FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_change();
