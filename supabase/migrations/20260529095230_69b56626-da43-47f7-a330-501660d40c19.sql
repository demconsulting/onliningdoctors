ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS test_user boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS demo_user boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'production'
    CHECK (environment IN ('production','test','staging','demo'));

CREATE INDEX IF NOT EXISTS idx_profiles_test_demo ON public.profiles(test_user, demo_user, environment);

CREATE OR REPLACE FUNCTION public.is_test_or_demo_user(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id
      AND (test_user = true OR demo_user = true OR environment = 'test')
  );
$$;