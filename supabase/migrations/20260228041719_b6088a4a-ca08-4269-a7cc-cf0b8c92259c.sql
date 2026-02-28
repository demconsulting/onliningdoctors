
-- Fix 1: Restrict notification INSERT policy to prevent cross-user spam
DROP POLICY IF EXISTS "Authenticated users can receive notifications" ON public.notifications;

CREATE POLICY "Users can create own notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Fix 2: Add length constraint on profiles.full_name for defense-in-depth
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_full_name_length CHECK (length(full_name) <= 200);
