
-- Table for patients to authorize document sharing with specific doctors for specific appointments
CREATE TABLE public.document_sharing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.profiles(id),
  doctor_id uuid NOT NULL REFERENCES public.profiles(id),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(patient_id, doctor_id, appointment_id)
);

ALTER TABLE public.document_sharing ENABLE ROW LEVEL SECURITY;

-- Patients can view and manage their own sharing permissions
CREATE POLICY "Patients can view own sharing" ON public.document_sharing
  FOR SELECT USING (patient_id = auth.uid());

CREATE POLICY "Patients can create sharing" ON public.document_sharing
  FOR INSERT WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Patients can update own sharing" ON public.document_sharing
  FOR UPDATE USING (patient_id = auth.uid());

CREATE POLICY "Patients can delete own sharing" ON public.document_sharing
  FOR DELETE USING (patient_id = auth.uid());

-- Doctors can see sharing that grants them access
CREATE POLICY "Doctors can view sharing granted to them" ON public.document_sharing
  FOR SELECT USING (doctor_id = auth.uid());

-- Allow doctors to view patient documents when sharing is active
CREATE POLICY "Doctors can view shared documents" ON public.patient_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.document_sharing ds
      WHERE ds.patient_id = patient_documents.patient_id
        AND ds.doctor_id = auth.uid()
        AND ds.is_active = true
    )
  );
