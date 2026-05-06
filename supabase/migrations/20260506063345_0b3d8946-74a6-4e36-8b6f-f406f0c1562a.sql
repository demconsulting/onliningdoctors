-- Restrict listing on public 'avatars' bucket. Public read still works via the
-- public object endpoint (getPublicUrl) because the bucket is marked public,
-- but we remove the broad SELECT policy that allowed clients to enumerate
-- (list) all files in the bucket.

DROP POLICY IF EXISTS "Public can read avatars" ON storage.objects;

CREATE POLICY "Users can view own avatar"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);