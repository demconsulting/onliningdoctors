
-- 1. PROFILES: column-level grants for anon
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, full_name, avatar_url, city, country, state, created_at) ON public.profiles TO anon;

-- 2. DOCTORS: hide license_document_path from anon
REVOKE SELECT ON public.doctors FROM anon;
GRANT SELECT (
  id, profile_id, specialty_id, consultation_category_id, title, bio,
  experience_years, license_number, consultation_fee, rating, total_reviews,
  is_available, languages, education, hospital_affiliation, is_verified,
  is_suspended, practice_name, practice_email, practice_phone, practice_logo_url,
  created_at, updated_at
) ON public.doctors TO anon;

-- 3. SITE CONTENT: drop existing public SELECT policies, recreate excluding sensitive keys
DO $$
DECLARE pol record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='site_content') THEN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='site_content' AND cmd='SELECT' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.site_content', pol.policyname);
    END LOOP;
  END IF;
END$$;

CREATE POLICY "Public can view non-sensitive site content"
ON public.site_content FOR SELECT TO anon, authenticated
USING (key NOT IN ('paystack_config'));

CREATE POLICY "Authenticated can view all site content"
ON public.site_content FOR SELECT TO authenticated
USING (true);

-- 4. AI_CONVERSATIONS: remove anonymous direct write capability (all writes go through edge function)
DROP POLICY IF EXISTS "Anyone can insert ai conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "Users can update own ai conversations" ON public.ai_conversations;

CREATE POLICY "Authenticated users can insert own ai conversations"
ON public.ai_conversations FOR INSERT TO authenticated
WITH CHECK (length(session_id) > 0 AND user_id = auth.uid());

CREATE POLICY "Users can update own ai conversations"
ON public.ai_conversations FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 5. AI_MESSAGES: only allow authenticated users to insert into their own conversation
DROP POLICY IF EXISTS "Anyone can insert ai messages" ON public.ai_messages;

CREATE POLICY "Authenticated users can insert into own ai messages"
ON public.ai_messages FOR INSERT TO authenticated
WITH CHECK (
  length(role) > 0
  AND EXISTS (
    SELECT 1 FROM public.ai_conversations c
    WHERE c.id = ai_messages.conversation_id
      AND c.user_id = auth.uid()
  )
);

-- 6. AI_HANDOFFS: lock anonymous insert
DROP POLICY IF EXISTS "Anyone can insert ai handoffs" ON public.ai_handoffs;
CREATE POLICY "Authenticated users can insert ai handoffs"
ON public.ai_handoffs FOR INSERT TO authenticated
WITH CHECK (
  length(reason) > 0
  AND EXISTS (
    SELECT 1 FROM public.ai_conversations c
    WHERE c.id = ai_handoffs.conversation_id
      AND (c.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);

-- 7. Revoke EXECUTE on event trigger function
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
