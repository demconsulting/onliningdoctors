
-- Phase 2: Appointments, availability, patient data, documents

-- 1. Doctor availability
CREATE TABLE public.doctor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  slot_duration_minutes INT DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Doctor pricing tiers
CREATE TABLE public.doctor_pricing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Appointments
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pricing_tier_id UUID REFERENCES public.doctor_pricing_tiers(id),
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled','completed','no_show')),
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Patient medical info
CREATE TABLE public.patient_medical_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  blood_type TEXT,
  allergies TEXT,
  chronic_conditions TEXT,
  current_medications TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  height_cm NUMERIC(5,1),
  weight_kg NUMERIC(5,1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_patient_medical_info_updated_at
  BEFORE UPDATE ON public.patient_medical_info
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Patient documents (metadata)
CREATE TABLE public.patient_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT,
  file_size BIGINT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Storage bucket for patient documents
INSERT INTO storage.buckets (id, name, public) VALUES ('patient-documents', 'patient-documents', false);

-- ========== RLS POLICIES ==========

-- Doctor availability: public read, doctor manages own
CREATE POLICY "Anyone can view doctor availability"
  ON public.doctor_availability FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Doctors can manage own availability"
  ON public.doctor_availability FOR ALL
  TO authenticated
  USING (doctor_id = auth.uid())
  WITH CHECK (doctor_id = auth.uid());

-- Doctor pricing: public read, doctor manages own
CREATE POLICY "Anyone can view pricing tiers"
  ON public.doctor_pricing_tiers FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Doctors can manage own pricing"
  ON public.doctor_pricing_tiers FOR ALL
  TO authenticated
  USING (doctor_id = auth.uid())
  WITH CHECK (doctor_id = auth.uid());

-- Appointments
CREATE POLICY "Patients can view own appointments"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

CREATE POLICY "Doctors can view their appointments"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (doctor_id = auth.uid());

CREATE POLICY "Patients can create appointments"
  ON public.appointments FOR INSERT
  TO authenticated
  WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Doctors can update appointment status"
  ON public.appointments FOR UPDATE
  TO authenticated
  USING (doctor_id = auth.uid());

CREATE POLICY "Patients can cancel own appointments"
  ON public.appointments FOR UPDATE
  TO authenticated
  USING (patient_id = auth.uid() AND status IN ('pending','confirmed'));

-- Patient medical info
CREATE POLICY "Patients can view own medical info"
  ON public.patient_medical_info FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

CREATE POLICY "Patients can upsert own medical info"
  ON public.patient_medical_info FOR INSERT
  TO authenticated
  WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Patients can update own medical info"
  ON public.patient_medical_info FOR UPDATE
  TO authenticated
  USING (patient_id = auth.uid());

-- Patient documents
CREATE POLICY "Patients can view own documents"
  ON public.patient_documents FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

CREATE POLICY "Patients can upload documents"
  ON public.patient_documents FOR INSERT
  TO authenticated
  WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Patients can delete own documents"
  ON public.patient_documents FOR DELETE
  TO authenticated
  USING (patient_id = auth.uid());

-- Storage policies for patient-documents bucket
CREATE POLICY "Patients can upload own documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'patient-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Patients can view own documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'patient-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Patients can delete own documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'patient-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
