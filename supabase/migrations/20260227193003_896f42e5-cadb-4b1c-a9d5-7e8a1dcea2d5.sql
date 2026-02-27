
-- Allow doctors to download files from patient-documents bucket when sharing is active
CREATE POLICY "Doctors can view shared patient documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'patient-documents'
  AND EXISTS (
    SELECT 1 FROM public.document_sharing ds
    WHERE ds.doctor_id = auth.uid()
      AND ds.is_active = true
      AND ds.patient_id::text = (storage.foldername(name))[1]
  )
);
