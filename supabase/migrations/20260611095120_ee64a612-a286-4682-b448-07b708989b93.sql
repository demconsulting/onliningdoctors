CREATE POLICY "Admins can view patient documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'patient-documents' AND public.has_role(auth.uid(), 'admin'));