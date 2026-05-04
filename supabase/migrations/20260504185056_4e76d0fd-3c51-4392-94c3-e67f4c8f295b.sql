DROP POLICY IF EXISTS "Branding assets are publicly accessible" ON storage.objects;
CREATE POLICY "Admins can list branding assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'branding' AND has_role(auth.uid(), 'admin'::app_role));