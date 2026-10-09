CREATE TABLE public.doctor_patient_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT doctor_patient_assignments_unique UNIQUE (doctor_id, patient_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doctor_patient_assignments TO authenticated;
GRANT ALL ON public.doctor_patient_assignments TO service_role;
ALTER TABLE public.doctor_patient_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage assignments" ON public.doctor_patient_assignments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'platform_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'platform_admin'));
CREATE POLICY "Doctors view own assignments" ON public.doctor_patient_assignments FOR SELECT TO authenticated USING (doctor_id = auth.uid());
CREATE POLICY "Patients view own assignments" ON public.doctor_patient_assignments FOR SELECT TO authenticated USING (patient_id = auth.uid());

CREATE TABLE public.medical_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  action_type text NOT NULL,
  target_patient_id uuid,
  record_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.medical_audit_logs TO authenticated;
GRANT SELECT, INSERT ON public.medical_audit_logs TO service_role;
ALTER TABLE public.medical_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated insert own audit logs" ON public.medical_audit_logs FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid() AND length(action_type) > 0 AND length(record_type) > 0);
CREATE POLICY "Admins read audit logs" ON public.medical_audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'platform_admin'));

CREATE OR REPLACE FUNCTION public.prevent_medical_audit_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'medical_audit_logs is append-only';
END; $$;
CREATE TRIGGER medical_audit_logs_immutable BEFORE UPDATE OR DELETE ON public.medical_audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_medical_audit_mutation();
CREATE INDEX idx_medical_audit_logs_created ON public.medical_audit_logs(created_at DESC);
CREATE INDEX idx_medical_audit_logs_patient ON public.medical_audit_logs(target_patient_id);

CREATE OR REPLACE FUNCTION public.get_my_assigned_patients()
RETURNS TABLE(patient_id uuid, full_name text, email text, phone text, assigned_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.full_name, p.email, p.phone, a.created_at
  FROM doctor_patient_assignments a JOIN profiles p ON p.id = a.patient_id
  WHERE a.doctor_id = auth.uid() ORDER BY p.full_name;
$$;

CREATE OR REPLACE FUNCTION public.get_assigned_patient_detail(_patient_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM doctor_patient_assignments WHERE doctor_id = auth.uid() AND patient_id = _patient_id) THEN
    RAISE EXCEPTION 'Not assigned to this patient';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM medical_audit_logs WHERE actor_id = auth.uid() AND target_patient_id = _patient_id AND action_type = 'READ' AND created_at > now() - interval '2 minutes') THEN
    RAISE EXCEPTION 'An audit entry is required before viewing patient data';
  END IF;
  SELECT jsonb_build_object(
    'full_name', p.full_name, 'email', p.email, 'phone', p.phone, 'date_of_birth', p.date_of_birth,
    'gender', p.gender, 'city', p.city, 'country', p.country,
    'blood_type', m.blood_type, 'allergies', m.allergies, 'chronic_conditions', m.chronic_conditions,
    'current_medications', m.current_medications, 'height_cm', m.height_cm, 'weight_kg', m.weight_kg,
    'emergency_contact_name', m.emergency_contact_name, 'emergency_contact_phone', m.emergency_contact_phone)
  INTO r FROM profiles p LEFT JOIN patient_medical_info m ON m.patient_id = p.id WHERE p.id = _patient_id;
  RETURN r;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_medical_audit_logs(_limit int DEFAULT 500)
RETURNS TABLE(id uuid, created_at timestamptz, action_type text, record_type text, actor_id uuid, actor_name text, target_patient_id uuid, patient_name text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'platform_admin')) THEN
    RAISE EXCEPTION 'Admins only';
  END IF;
  RETURN QUERY SELECT l.id, l.created_at, l.action_type, l.record_type, l.actor_id, a.full_name, l.target_patient_id, p.full_name
  FROM medical_audit_logs l LEFT JOIN profiles a ON a.id = l.actor_id LEFT JOIN profiles p ON p.id = l.target_patient_id
  ORDER BY l.created_at DESC LIMIT LEAST(_limit, 2000);
END; $$;

REVOKE EXECUTE ON FUNCTION public.get_my_assigned_patients() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_assigned_patient_detail(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_medical_audit_logs(int) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_my_assigned_patients() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_assigned_patient_detail(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_medical_audit_logs(int) TO authenticated;