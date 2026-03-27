
-- Storage bucket for prescription assets (logos, signatures)
INSERT INTO storage.buckets (id, name, public) VALUES ('prescription-assets', 'prescription-assets', false);

-- Doctors can upload their own assets
CREATE POLICY "Doctors can upload prescription assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'prescription-assets'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Doctors can view their own assets
CREATE POLICY "Doctors can view own prescription assets"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'prescription-assets'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Patients can view prescription assets for their prescriptions
CREATE POLICY "Patients can view prescription assets"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'prescription-assets'
  AND EXISTS (
    SELECT 1 FROM prescriptions p
    WHERE p.patient_id = auth.uid()
    AND (p.doctor_logo_url LIKE '%' || name OR p.doctor_signature_url LIKE '%' || name)
  )
);

-- Doctors can update/delete own assets
CREATE POLICY "Doctors can manage own prescription assets"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'prescription-assets'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
