DROP POLICY IF EXISTS "media public read" ON storage.objects;
CREATE POLICY "media managers list" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'media' AND public.has_permission(auth.uid(), 'manage_media'::public.app_permission));