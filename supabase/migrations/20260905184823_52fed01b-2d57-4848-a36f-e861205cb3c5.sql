-- Practice owners manage photos in their own folder (first path segment = their user id)
CREATE POLICY "Practice owners upload own photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'practice-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Practice owners update own photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'practice-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Practice owners delete own photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'practice-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Owners and admins read practice photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'practice-photos'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'platform_admin'::app_role)
  )
);
