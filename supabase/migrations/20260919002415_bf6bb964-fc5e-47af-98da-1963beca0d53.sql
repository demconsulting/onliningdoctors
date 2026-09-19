
-- Allow platform admins to manage avatar images for any user
CREATE POLICY "Admins can view any avatar"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars' AND public.is_platform_admin(auth.uid()));

CREATE POLICY "Admins can upload any avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND public.is_platform_admin(auth.uid()));

CREATE POLICY "Admins can update any avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND public.is_platform_admin(auth.uid()))
WITH CHECK (bucket_id = 'avatars' AND public.is_platform_admin(auth.uid()));

CREATE POLICY "Admins can delete any avatar"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND public.is_platform_admin(auth.uid()));

-- Allow platform admins to update profile records (e.g. profile picture)
CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE TO authenticated
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));
