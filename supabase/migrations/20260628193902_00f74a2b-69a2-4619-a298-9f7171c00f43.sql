
-- Doctors can upload to their own folder in expense-receipts bucket
CREATE POLICY "Doctors can upload own expense receipts"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'expense-receipts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Doctors can update own expense receipts"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'expense-receipts'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'expense-receipts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Doctors can delete own expense receipts"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'expense-receipts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Patients can submit their own practice patient link requests
CREATE POLICY "Users can create their own link requests"
ON public.practice_patient_link_requests
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());
